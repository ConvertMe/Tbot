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
              errorLogs.push({logType: type, date: new Date(), log})
              if (errorLogs.length > 5000) errorLogs.pop()
    
              writeFileSync(pathToErrorLog, JSON.stringify(errorLogs))
              return true
            }
          }
        } catch (e) {
          console.error(`------------------------------------------------------------------------------------Error write log-------------------------------------------------------------------------------------------`, e)
        }
      }

      createFilesSystemFiles() {
          try {
            const systemFiles = [{fileName: "errorlogs.json", emptyData: []}]
            systemFiles.forEach(f => {
              try {
                readFileSync(this.getPathToStorage() + `/${f.fileName}`)
              } catch (e) {
                writeFileSync(this.getPathToStorage() + `/${f.fileName}`, JSON.stringify(f.emptyData))
              }
            })
          } catch (e) {
            console.log("---------------------------------------------------------------ERROR CREATE SYSTEM FILES-------------------------------------------------------------------")
            console.log(e)
          }
      }
}

export default new OtherService()