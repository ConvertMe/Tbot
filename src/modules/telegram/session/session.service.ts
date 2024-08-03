import { pool } from "../../db/db"
import { InsertResponseDBT, SelectResponseDBT,  UpdateResponseDBT } from "../../db/types"
import otherService from "../../other/other.service"
import userService from "../users/users"
import { TelegramButtonI } from "../types"
import { UserI } from "../users/types"
import { ComplexI, HandlerSessionI, SessionI, StructDBSessionI } from "./types"



class SessionService {

    private errorMsg = "Произошла ошибка, повторите свою попытку позже"
    private yourName = "Ваше имя?"
    private yourPhone = "Ваш телефон?"

    async toReact(ctx: any, type?: "start") {
        try {
          const username: string = ctx.chat.username
          let msg = ""
          if(ctx.update && ctx.update.message && ctx.update.message.text) msg = ctx.update.message.text
          if(!username) return
          if(type === "start") ctx.reply(`Здравствуйте ${username}!\nЯ чат-бот управляющих компаний ГК ТОЧНО`)
          const isAuth = await userService.isAuth(username)
          
          if(!isAuth) return ctx.reply(`Извините, не нашёл вас в списке пользователей группы Амбассадоров ЖК, обратитесь к администратору группы`)
          
          const session = await this.handler(msg, isAuth)
      
          ctx.reply(session.msg, session.buttons)
          return
        } catch (e) {
          otherService.writelog("error", e)
          console.log(e)
        }
      }

    async handler(msg: string, user: UserI): Promise<{msg: string, buttons?: TelegramButtonI}> {
        try {
            const session = await this.getSession(user)
            //handle
            if((session.user.name || session.user.phone) && !session.launched) {
                console.log('0')
                await this.updateSession({...session, launched: true, session: {...session.session, 
                    nameRecorded: session.user.name ? true : false,
                    phoneRecorded: session.user.phone ? true : false,
                }})

                //recursive
                return await this.handler(msg, user)

            } else if(!session.launched) {
                console.log("1")
                await this.updateSession({...session,  launched: true, session: {...session.session}})
                return {msg: this.yourName}
            } 
            
            if(!session.session.nameRecorded) {
                console.log("2")

                const result = await this.updateUsersValues("name", msg, {...session, session: {...session.session, nameRecorded: true}})
                if(!result) throw new Error()
               
                return {msg: this.yourPhone}

            } else if(!session.session.phoneRecorded) {
                console.log("3")

                const result = await this.updateUsersValues("phone", msg, {...session, session: {...session.session, phoneRecorded: true}})
                if(!result) throw new Error()

                return {msg: `${user.name!} выберите пожалуйста, ЖК в который хотите оставить заявку`, buttons: await this.getComplexes()}
                //continion in actions
            } else if(session.session.phoneRecorded && !session.session.resComplexId) {
                if(session.user.lastResComplexId) {
                    return {msg: `${user.name!} последний ЖК в котором вы оставляли заявку`, buttons: await this.getComplexes(session.user.lastResComplexId)}
                } else  return {msg: `${user.name!} выберите пожалуйста, ЖК в который хотите оставить заявку`, buttons: await this.getComplexes()}
            } else if(!session.session.resComplexId || 
                (!session.session.geo.description && !session.session.geo.geolocation)
            ) {
                console.log("4")
                return this.reactToGeo()
                
            }
            console.log("end session")
            return {msg: "end session"}
        } catch (e) {
            console.log(e)
            otherService.writelog("error", e)
            return {msg: "Произошла ошибка, повторите свою попытку позже"}
        }
    }

    reactToGeo(): {msg: string, buttons: TelegramButtonI} {
        return {msg: 'Вы хотите предоставить доступ к гео или описать текстом?', buttons: {
            reply_markup: {
                inline_keyboard: [[
                    { text: 'Гео', callback_data: 'geo' }, 
                    { text: 'Текстом', callback_data: 'geodescription' }
                ]]
            }
        }}
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

    async getComplexes(lastResComplexId?: number): Promise<TelegramButtonI> {
        try {
            let complexes: ComplexI[] = await pool.execute(`select * from complex`).then((r: SelectResponseDBT<ComplexI>) => r[0])

            if(lastResComplexId) {
                complexes = complexes.filter(c => c.id === lastResComplexId)
                if(complexes.length === 0) complexes.push({id: 0, name: "ЖК не найден, показать все?", createdAt: String(new Date())})
                else complexes.push({id: 0, name: "Показать все?", createdAt: String(new Date())})
                return {
                    reply_markup: {
                        inline_keyboard: complexes.map(c => ([{ text: `${c.name}`, callback_data: `complexId=${c.id}`}]))
                    }}
            } else {
                return {
                    reply_markup: {
                        inline_keyboard: complexes.map(c => ([{ text: `${c.name}`, callback_data: `complexId=${c.id}`}]))
                    }}
            }

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
                    await this.updateSession(session)
                    return true
                } else return false
            })

        } catch (e) {
            throw e
        }
    }

    private async setDescription(msg: string, session: HandlerSessionI): Promise<boolean> {
        try {
            return await pool.execute(`update session set session=? where userId = ?`, [{...session.session, description: msg}, session.user.id])
            .then((r: UpdateResponseDBT) => r[0].changedRows ? true : false)
        } catch (e) {
            throw e
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
            throw e
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
            throw e
        }
    }

    private async updateSession (session: HandlerSessionI): Promise<boolean> {
        return await pool.execute(`update session set  launched=?, session=? where userId = ?`, [session.launched, JSON.stringify(session.session), session.user.id])
        .then((r: UpdateResponseDBT) => r[0].changedRows ? true : false)
    } 

    getEmptySession(): SessionI {
        return {
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