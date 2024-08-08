import {Router} from "express"
import filesController from "../modules/files/files.controller"

const route = Router()

route.get("/:filehash", filesController.getFile)

export default route