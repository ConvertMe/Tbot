import { v4 } from "uuid"
import { pool } from "../db/db"
import sessionService from "../telegram/session/session.service"
import { HandlerSessionI } from "../telegram/session/types"
import { SelectResponseDBT } from "../db/types"
import { ContentFileI, TelegramResponseGetLinkI } from "./types"
import axios from "axios"
import dotenv from "dotenv"
import otherService from "../other/other.service"
import { createWriteStream, readdirSync, readFileSync, unlinkSync } from "fs"
dotenv.config()

class TelegramFilesService {

    async getFile(fileHash: string): Promise<any> {
        try {
            const resultFindeHash: ContentFileI | undefined = await pool.execute(`select * from telegramFiles where fileHash = ?`, [fileHash]).then((r: SelectResponseDBT) => r[0][0])
            if(!resultFindeHash) throw new Error()
            
            let pathToFile
            try {
                const dir = readdirSync(otherService.getPathToStorage())
                dir.forEach(r => {
                    if(new RegExp(resultFindeHash.fileHash).test(r)) pathToFile = otherService.getPathToStorage() + "/" + r
                })
                if(!pathToFile) throw new Error()
            } catch (e){
                const fileLink: string = await axios.get(`https://api.telegram.org/bot${process.env.TELEGRAM_TOKEN}/getFile?file_id=${resultFindeHash.telegramFileId}`)
                .then(r => {
                    if (r.status === 200) {
                        const response: TelegramResponseGetLinkI = r.data 
                        const filePath = response.result.file_path
                        const fileLink = `https://api.telegram.org/file/bot${process.env.TELEGRAM_TOKEN}/${filePath}`
                        return fileLink
                    } else {
                        throw new Error('Error fetching file link')
                    }
                })
                 pathToFile = await this.downloadFile(fileLink, resultFindeHash.fileHash)
            }
            
            return pathToFile
        } catch (e) {
            otherService.writelog("error", e)
            throw e
        }
    }

    async saveFile(fileType: "video" | "img", file_id: string, session: HandlerSessionI) {
        const fileHash = v4()
        await pool.execute(`
            insert into telegramFiles (telegramFileId,userId,fileHash,sessionHash,format) 
            values (?,?,?,?,?)
            `, [file_id, session.user.id, fileHash, session.hash, fileType])

        if(fileType === "video") session.session.content.videos.push(fileHash) 
        else session.session.content.images.push(fileHash)   
        
        await sessionService.updateSession(session) 
        return
    }

    private async downloadFile(url: string, hashFile: string): Promise<string> {
        try {
            const ext = url.split(".")[url.split(".").length - 1]
            const outputPath = otherService.getPathToStorage() + `/${hashFile}.${ext}`
            const response = await axios({
                method: 'get',
                url: url,
                responseType: 'stream' 
            });
    
            const writer = createWriteStream(outputPath)
    
            response.data.pipe(writer)
    
            return new Promise((resolve, reject) => {
                writer.on('finish', async () => {
                    await pool.execute(`insert into garbageСollectorFiles (pathToFile) values (?)`, [outputPath])
                    resolve(outputPath)
                })
                writer.on('error', (err) => {
                    unlinkSync(outputPath)
                    reject(err)
                })
            })
        } catch (e) {
            throw e
        }
    } 
}

export default new TelegramFilesService()