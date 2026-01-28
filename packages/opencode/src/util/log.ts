import path from "path"
import fs from "fs/promises"
import { Global } from "../global"
import z from "zod"

export namespace Log {
  export const Level = z.enum(["DEBUG", "INFO", "WARN", "ERROR"]).meta({ ref: "LogLevel", description: "Log level" })
  export type Level = z.infer<typeof Level>

  const levelPriority: Record<Level, number> = {
    DEBUG: 0,
    INFO: 1,
    WARN: 2,
    ERROR: 3,
  }

  // ANSI color codes
  const colors = {
    reset: "\x1b[0m",
    gray: "\x1b[90m",
    white: "\x1b[37m",
    blue: "\x1b[34m",
    green: "\x1b[32m",
    yellow: "\x1b[33m",
    red: "\x1b[31m",
    cyan: "\x1b[36m",
    magenta: "\x1b[35m",
  }

  const levelColors: Record<Level, string> = {
    DEBUG: colors.blue,
    INFO: colors.white,
    WARN: colors.yellow,
    ERROR: colors.red,
  }

  let level: Level = "INFO"

  function shouldLog(input: Level): boolean {
    return levelPriority[input] >= levelPriority[level]
  }

  export type Logger = {
    debug(message?: any, extra?: Record<string, any>): void
    info(message?: any, extra?: Record<string, any>): void
    error(message?: any, extra?: Record<string, any>): void
    warn(message?: any, extra?: Record<string, any>): void
    tag(key: string, value: string): Logger
    clone(): Logger
    time(
      message: string,
      extra?: Record<string, any>,
    ): {
      stop(extraOnStop?: Record<string, any>): void
      [Symbol.dispose](): void
    }
  }

  const loggers = new Map<string, Logger>()

  export const Default = create({ service: "default" })

  export interface Options {
    print: boolean
    dev?: boolean
    level?: Level
  }

  let logpath = ""
  export function file() {
    return logpath
  }
  let write = (msg: any) => {
    process.stderr.write(msg)
    return msg.length
  }

  export async function init(options: Options) {
    if (options.level) level = options.level
    cleanup(Global.Path.log)
    if (options.print) return
    logpath = path.join(
      Global.Path.log,
      options.dev ? "dev.log" : new Date().toISOString().split(".")[0].replace(/:/g, "") + ".log",
    )
    const logfile = Bun.file(logpath)
    await fs.truncate(logpath).catch(() => {})
    const writer = logfile.writer()
    write = async (msg: any) => {
      const num = writer.write(msg)
      writer.flush()
      return num
    }
  }

  async function cleanup(dir: string) {
    const glob = new Bun.Glob("????-??-??T??????.log")
    const files = await Array.fromAsync(
      glob.scan({
        cwd: dir,
        absolute: true,
      }),
    )
    if (files.length <= 5) return

    const filesToDelete = files.slice(0, -10)
    await Promise.all(filesToDelete.map((file) => fs.unlink(file).catch(() => {})))
  }

  function formatError(error: Error, depth = 0): string {
    const result = error.message
    return error.cause instanceof Error && depth < 10
      ? result + " Caused by: " + formatError(error.cause, depth + 1)
      : result
  }

  export function create(tags?: Record<string, any>) {
    tags = tags || {}

    const service = tags["service"]
    if (service && typeof service === "string") {
      const cached = loggers.get(service)
      if (cached) {
        return cached
      }
    }

    function formatTimestamp(date: Date): string {
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, "0")
      const day = String(date.getDate()).padStart(2, "0")
      const hours = String(date.getHours()).padStart(2, "0")
      const minutes = String(date.getMinutes()).padStart(2, "0")
      const seconds = String(date.getSeconds()).padStart(2, "0")
      const ms = String(date.getMilliseconds()).padStart(3, "0")
      return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}.${ms}`
    }

    function getCallerInfo(): string {
      const stack = new Error().stack
      if (!stack) return ""
      
      const lines = stack.split("\n")
      // Skip first 4 lines: Error, getCallerInfo, build, and the log method (debug/info/etc)
      for (let i = 4; i < lines.length; i++) {
        const line = lines[i]
        // Match file path and line number
        const match = line.match(/\((.+):(\d+):(\d+)\)/) || line.match(/at (.+):(\d+):(\d+)/)
        if (match) {
          const filePath = match[1]
          const lineNum = match[2]
          // Extract parent directory and filename from the full path
          const parts = filePath.split("/")
          const fileName = parts.pop() || filePath
          const parentDir = parts.pop()
          const displayPath = parentDir ? `${parentDir}/${fileName}` : fileName
          return `${displayPath}:${lineNum}`
        }
      }
      return ""
    }

    function build(level: Level, message: any, extra?: Record<string, any>) {
      const timestamp = formatTimestamp(new Date())
      const levelColor = levelColors[level]
      const callerInfo = getCallerInfo()
      
      const prefix = Object.entries({
        ...tags,
        ...extra,
      })
        .filter(([_, value]) => value !== undefined && value !== null)
        .map(([key, value]) => {
          if (value instanceof Error) return `${key}:` + formatError(value)
          if (typeof value === "object") return `${key}:` + JSON.stringify(value)
          return `${key}:${value}`
        })
        .join(" ")
      
      const parts = [
        level.padEnd(5),
        callerInfo || null,
        prefix,
        message
      ]
      const content = parts.filter(Boolean).join(" | ")
      return `${colors.gray}${timestamp}${colors.reset} | ${levelColor}${content}${colors.reset}\n`
    }
    const result: Logger = {
      debug(message?: any, extra?: Record<string, any>) {
        if (shouldLog("DEBUG")) {
          write(build("DEBUG", message, extra))
        }
      },
      info(message?: any, extra?: Record<string, any>) {
        if (shouldLog("INFO")) {
          write(build("INFO", message, extra))
        }
      },
      error(message?: any, extra?: Record<string, any>) {
        if (shouldLog("ERROR")) {
          write(build("ERROR", message, extra))
        }
      },
      warn(message?: any, extra?: Record<string, any>) {
        if (shouldLog("WARN")) {
          write(build("WARN", message, extra))
        }
      },
      tag(key: string, value: string) {
        if (tags) tags[key] = value
        return result
      },
      clone() {
        return Log.create({ ...tags })
      },
      time(message: string, extra?: Record<string, any>) {
        const now = Date.now()
        const startExtra = { ...extra }
        function stop(extraOnStop?: Record<string, any>) {
          const duration = Date.now() - now
          result.debug(message, {
            duration: `${duration}ms`,
            ...startExtra,
            ...extraOnStop,
          })
        }
        return {
          stop,
          [Symbol.dispose]() {
            stop()
          },
        }
      },
    }

    if (service && typeof service === "string") {
      loggers.set(service, result)
    }

    return result
  }
}
