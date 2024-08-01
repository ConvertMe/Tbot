import { pool } from "../../db/db"
import { UpdateResponseDBI } from "../../db/types"
import { UserI } from "../users/types"
import { HandlerSessionI, SessionI, StructDBSessionI } from "./types"



class SessionService {

    async handler(login: string, msg?: string): Promise<{msg: string}> {
        try {
            const user: UserI = await pool.execute(`select * from users where login = ?`, [login]).then((r: any) => r[0][0] as UserI)
           
            let session: StructDBSessionI | undefined = await pool.execute(`select * from session where userId = ?`, [login]).then((r: any) => r[0][0] as StructDBSessionI)
            
            if(!session) {
                session = await pool.execute(`insert into session (userId, session) values (?, ?)`, [user.id, this.getEmptySession()])
                .then( async (r) => await pool.execute(`select * from session where userId = ?`, [login]).then((r: any) => r[0][0] as StructDBSessionI))
            }
            
            
            return {msg: "Произошла ошибка, повторите свою попытку позже"}
        } catch (e) {
            return {msg: "Произошла ошибка, повторите свою попытку позже"}
        }
    }

    private async updateUsersValues(type: "phone" | "name" | "lastResComplexId", msg: string, session: HandlerSessionI): Promise<boolean> {
        try {
            return await pool.execute(`update users set ${type}=? where id = ?`, [msg, session.user.id])
            .then((r: any) => r[0][0] as UpdateResponseDBI)
            .then(async r => {
                if(r.changedRows) {
                    if(type === "name") session.session.nameRecorded = true
                    if(type === "phone") session.session.phoneRecorded = true
                    if(type === "lastResComplexId") session.session.resComplexId = Number(msg)
                    await pool.execute(`update session set session=? where userId = ?`, [session.session, session.user.id])
                    return true
                } else return false
            })
        } catch (e) {
            return false
        }
    }

    private async setDescription(msg: string, session: HandlerSessionI): Promise<boolean> {
        try {
            return await pool.execute(`update session set session=? where userId = ?`, [{...session.session, description: msg}, session.user.id])
            .then((r: any) => r[0][0] as UpdateResponseDBI)
            .then(r => r.changedRows ? true : false)
        } catch (e) {
            return false
        }
    }

    private async setGeo(type: "txt" | "geo" | "geoOnSpot", msg: string, session: HandlerSessionI): Promise<boolean> {
        try {

            const updateSession = async (session: HandlerSessionI): Promise<boolean> => await pool.execute(`update session set session=? where userId = ?`, [session.session, session.user.id])
            .then((r: any) => r[0][0] as UpdateResponseDBI)
            .then(r => r.changedRows ? true : false) 
            
            switch(type) {
                case "txt": return await updateSession({...session, session: {...session.session, geo: {...session.session.geo, description: msg}}})
                case "geo": return await updateSession({...session, session: {...session.session, geo: {...session.session.geo, geolocation: msg}}})
                case "geoOnSpot": return await updateSession({...session, session: {...session.session, geo: {...session.session.geo, geolocation: msg, onSpot: true}}})
                default: return false
            }

        } catch (e) {
            return false
        }
    }

    private async addContent(type: "img" | "video", ctx: any, session: HandlerSessionI) {
        try {

        } catch (e) {
            return false
        }
    }

    getEmptySession(): SessionI {
        return {
            nameRecorded: false,
            phoneRecorded: false,
            resComplexId: null,
            description: null,
            geo: {description: null, geolocation: null, onSpot: false},
            content: {images: [], videos: []},
        } 
    }

}

export default new SessionService()