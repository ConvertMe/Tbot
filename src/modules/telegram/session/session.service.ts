import { pool } from "../../db/db"
import { InsertResponseDBT, SelectResponseDBT,  UpdateResponseDBT } from "../../db/types"
import { TelegramButtonI } from "../types"
import { UserI } from "../users/types"
import { ComplexI, HandlerSessionI, SessionI, StructDBSessionI } from "./types"



class SessionService {

    private errorMsg = "Произошла ошибка, повторите свою попытку позже"
    private yourName = "Ваше имя?"
    private yourPhone = "Ваш телефон?"

    async handler(msg: string, user: UserI): Promise<{msg: string, buttons?: TelegramButtonI}> {
        try {
            const session = await this.getSession(user)
            console.log(session)
            //handle
            if(!session.session.launched) {
                await this.updateSession({...session, session: {...session.session, launched: true}})
                return {msg: this.yourName}
            } else if(!session.session.nameRecorded) {
                const result = await this.updateUsersValues("name", msg, {...session, session: {...session.session, nameRecorded: true}})
                if(!result) throw new Error()
               
                return {msg: this.yourPhone}

            } else if(!session.session.phoneRecorded) {
                const result = await this.updateUsersValues("phone", msg, {...session, session: {...session.session, phoneRecorded: true}})
                if(!result) throw new Error()

                return {msg: `${user.name!} выберите пожалуйста, ЖК в который хотите оставить заявку`, buttons: await this.getComplexes()}
                //continion in actions
            } else if(session.session.resComplexId && 
                (!session.session.geo.description && !session.session.geo.geolocation)
            ) {

            }
            
            
            return {msg: "Произошла ошибка, повторите свою попытку позже"}
        } catch (e) {
            console.log(e)
            return {msg: "Произошла ошибка, повторите свою попытку позже"}
        }
    }

    async getSession(user: UserI): Promise<HandlerSessionI> {
        try {  
            let sessionDb: StructDBSessionI | undefined = await pool.execute(`select * from session where userId = ?`, [user.id]).then((r: any) => r[0][0] as StructDBSessionI)
            
            if(!sessionDb) {
                sessionDb = await pool.execute(`insert into session (userId, session) values (?, ?)`, [user.id, JSON.stringify(this.getEmptySession())])
                .then( async (r: InsertResponseDBT) => await pool.execute(`select * from session where userId = ?`, [user.id]).then((r: any) => r[0][0] as StructDBSessionI))
            }
            if(!sessionDb) throw new Error()

            return await pool.query(`select * from users where id = ?`, [sessionDb.userId]).then((r: SelectResponseDBT<UserI>) => {
                const user = r[0][0] 
                if(!user) throw new Error()
                let handlerSessionI = JSON.parse(JSON.stringify(sessionDb))
                delete handlerSessionI.userId
                return {...handlerSessionI, user}
            })
        } catch (e) {
            throw e
        }
    }

    private async getComplexes(): Promise<TelegramButtonI> {
        try {
            const complexes: ComplexI[] = await pool.execute(`select * from complex`).then((r: SelectResponseDBT<ComplexI>) => r[0])
            return {
                reply_markup: {
                    inline_keyboard: complexes.map(c => ([{ text: `${c.name}`, callback_data: `complexId=${c.id}`}]))
                }}
        } catch (e) { 
            throw e
        }
    }

    async updateUsersValues(type: "phone" | "name" | "lastResComplexId", msg: string, session: HandlerSessionI): Promise<boolean> {
        try {
            return await pool.execute(`update users set ${type}=? where id = ?`, [msg, session.user.id])
            .then(async (r: UpdateResponseDBT) => {
                if(r[0].changedRows) {
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
            .then((r: UpdateResponseDBT) => r[0].changedRows ? true : false)
        } catch (e) {
            return false
        }
    }

    private async setGeo(type: "txt" | "geo" | "geoOnSpot", msg: string, session: HandlerSessionI): Promise<boolean> {
        try {
    
            switch(type) {
                case "txt": return await this.updateSession({...session, session: {...session.session, geo: {...session.session.geo, description: msg}}})
                case "geo": return await this.updateSession({...session, session: {...session.session, geo: {...session.session.geo, geolocation: msg}}})
                case "geoOnSpot": return await this.updateSession({...session, session: {...session.session, geo: {...session.session.geo, geolocation: msg, onSpot: true}}})
                default: return false
            }

        } catch (e) {
            return false
        } 
    }

    private async addContent(type: "img" | "video", urlContent: string, session: HandlerSessionI) {
        try {
            switch(type) {
                case "img": return await this.updateSession({...session, session: {...session.session, content: {...session.session.content, images: [...session.session.content.images, urlContent]}}})
                case "video": return await this.updateSession({...session, session: {...session.session, content: {...session.session.content, videos: [...session.session.content.videos, urlContent]}}})
                default: return false
            }            
        } catch (e) {
            return false
        }
    }

    private async updateSession (session: HandlerSessionI): Promise<boolean> {
        return await pool.execute(`update session set session=? where userId = ?`, [JSON.stringify(session.session), session.user.id])
        .then((r: UpdateResponseDBT) => r[0].changedRows ? true : false)
    } 

    getEmptySession(): SessionI {
        return {
            launched: false,
            finished: false,
            nameRecorded: false,
            phoneRecorded: false,
            resComplexId: null,
            description: null,
            geo: {description: null, geolocation: null, onSpot: false},
            content: {images: [], videos: []}
        } 
    }

}

export default new SessionService()