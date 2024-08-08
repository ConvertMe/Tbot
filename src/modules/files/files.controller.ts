import {Request, Response, NextFunction} from "express"
import { join } from "path"
import filesService from "./files.service"

class TelegramFilesController {

    async getFile(req:Request,res:Response,next:NextFunction) {
        try {
            const {filehash} = req.params
            if(!filehash) return res.sendFile(join(__dirname, '404.html'))
            
            const file = await filesService.getFile(filehash)
            
            res.sendFile(file, )
            return

        } catch (e) {
            console.log(e)
            res.sendFile(join(__dirname, '404.html'))
            return
        }
    }
}

export default new TelegramFilesController()