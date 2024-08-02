import { readFileSync, writeFileSync } from "fs";
import path from "path";

class OtherService {
    
    getPathToStorage(): string {
        return path.resolve(__dirname, "..", "..", "storage")
    }

    writelog(type: "error", log: any): true | undefined {
        try {
          switch (type) {
            case "error": {
              const pathToErrorLog = this.getPathToStorage() + `/errorlogs.json`
    
              const errorLogs = JSON.parse(readFileSync(pathToErrorLog, { encoding: "utf-8" }))
              errorLogs.push(log)
              if (errorLogs.length > 1000) errorLogs.pop()
    
              writeFileSync(pathToErrorLog, JSON.stringify(errorLogs))
              return true
            }
          }
        } catch (e) {
          console.error(`------------------------------------------------------------------------------------Error write log-------------------------------------------------------------------------------------------`, e)
        }
      }
}

export default new OtherService()