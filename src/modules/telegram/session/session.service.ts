import {v4} from "uuid"
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
          const isAuth = await userService.isAuth(username)
          if(!isAuth) return ctx.reply(`Извините, не нашёл вас в списке пользователей группы Амбассадоров ЖК, обратитесь к администратору группы`)
          
          if(type === "start") ctx.reply(`Здравствуйте ${isAuth.name || username}!\nЯ чат-бот управляющих компаний ГК ТОЧНО`)
          
          const session = await this.handler(msg, isAuth, ctx)
      
          ctx.reply(session.msg, session.buttons)
          return
        } catch (e) {
          otherService.writelog("error", e)
          console.log(e)
        }
      }

    async handler(msg: string, user: UserI, ctx: any): Promise<{msg: string, buttons?: TelegramButtonI}> {
        try {
            let session = await this.getSession(user)
            //handle
            if((session.user.name || session.user.phone) && !session.launched) {
                console.log('0')
                const newSession = JSON.parse(JSON.stringify({...session.session, 
                    nameRecorded: session.user.name ? true : false,
                    phoneRecorded: session.user.phone ? true : false
                }))
                await this.updateSession({...session, launched: true, session: newSession})
                session = {...session, session: newSession}
                //recursive
                return await this.handler(msg, user, ctx)

            } 
            if(!session.launched) {
                console.log("1")
                await this.updateSession({...session,  launched: true, session: {...session.session}})
                return {msg: this.yourName}
            } 
            
            if(!session.session.nameRecorded) {

                const result = await this.updateUsersValues("name", msg, {...session, session: {...session.session, nameRecorded: true}})
                if(!result) throw new Error()
               
                return {msg: this.yourPhone}
            } 
            if(!session.session.phoneRecorded) {
                console.log("3")

                const result = await this.updateUsersValues("phone", msg, {...session, session: {...session.session, phoneRecorded: true}})
                if(!result) throw new Error()

                return {msg: `${user.name!} выберите пожалуйста, ЖК в который хотите оставить заявку`, buttons: await this.getComplexes()}
                //continion in actions
            }
            if(session.session.phoneRecorded && !session.session.resComplexId) {
                console.log("4")

                if(session.user.lastResComplexId) {
                    const complex: ComplexI | undefined = await pool.execute('select * from complex where id = ?', [session.user.lastResComplexId]).then((r: SelectResponseDBT) => r[0][0])
                    if(complex) return {msg: `Оставить заявку в ЖК "${complex.name}"`, buttons: await this.getComplexes(session.user.lastResComplexId)}
                    else return {msg: `${user.name!} последний ЖК в котором вы оставляли заявку`, buttons: await this.getComplexes()}
                } else  return {msg: `${user.name!} выберите пожалуйста, ЖК в который хотите оставить заявку`, buttons: await this.getComplexes()}
            }
            
            if(!session.session.resComplexId || 
                (!session.session.geo.geolocation && session.session.geo.type === "empty")
            ) {
                console.log("5")
                return this.reactToGeo()
                
            } 
            
            if(session.session.geo.type !== 'empty' && session.session.geo.type !== "description" && session.session.geo.geolocation === null) {
                switch(session.session.geo.type) {
                    case "geo": await this.updateSession({...session, session: {...session.session, geo: {...session.session.geo, geolocation: msg}}}); break
                    case "onSpot": await this.updateSession({...session, session: {...session.session, geo: {...session.session.geo, geolocation: msg}}}); break
                    default: break
                }

                return {msg: "Пришлите мне текстовое описание заявки"}
            }
            if(!session.session.description && session.session.geo.type === "description") {
                
                await this.updateSession({...session, session: {...session.session, description: msg}})


                return {msg: `Загружаем фото или видео контент?`, buttons:{
                    reply_markup: {
                        inline_keyboard: [
                            [
                                { text: "Да", callback_data: "sessionContent=yes" },
                                { text: "Нет", callback_data: "sessionContent=no" }
                            ]
                        ]
                    }}
            }
            }
            
            if(session.session.content.process === "streamOn") {
                return {msg: "Пришлите медиафайл"}
            }
            
            return {msg: "end session"}
        } catch (e) {
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
                sessionDb = await pool.execute(`insert into session (userId, hash, session) values (?, ?, ?)`, [user.id, v4(), JSON.stringify(this.getEmptySession())])
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
                else {
                    complexes[0].name = `Продолжить`
                    complexes.push({id: 0, name: "Другой ЖК", createdAt: String(new Date())})
                }
                return {
                    reply_markup: {
                        inline_keyboard: complexes.map(c => ([{ text: c.name, callback_data: `complexId=${c.id}`}]))
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
                    if(type === "name") session.session.nameRecorded = true
                    if(type === "phone") session.session.phoneRecorded = true
                    if(type === "lastResComplexId") session.session.resComplexId = Number(msg)
                    await this.updateSession(session)
                    return true
            })

        } catch (e) {
            throw e
        }
    }

    async setDescription(msg: string, session: HandlerSessionI): Promise<boolean> {
        try {
            return await pool.execute(`update session set session=? where userId = ?`, [{...session.session, description: msg}, session.user.id])
            .then((r: UpdateResponseDBT) => r[0].changedRows ? true : false)
        } catch (e) {
            throw e
        }
    }

    async setGeo(payload:{description?: string, geo?: any}, session: HandlerSessionI): Promise<boolean> {
        try {
            if(!payload.description && !payload.geo) throw new Error()
            if(session.session.geo.type === "empty") throw new Error()
    
            switch(session.session.geo.type) {
                case "geo": return await this.updateSession({...session, session: {...session.session, geo: {...session.session.geo, geolocation: payload.geo!}}})
                case "onSpot": return await this.updateSession({...session, session: {...session.session, geo: {...session.session.geo, geolocation: payload.geo!}}})
                default: return false
            }

        } catch (e) {
            throw e
        } 
    }

    async addContent(type: "img" | "video", urlContent: string, session: HandlerSessionI) {
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

    async updateSession (session: HandlerSessionI): Promise<boolean> {
        return await pool.execute(`update session set  launched=?, session=? where userId = ?`, [session.launched, JSON.stringify(session.session), session.user.id])
        .then((r: UpdateResponseDBT) => r[0].changedRows ? true : false)
    } 

    getEmptySession(): SessionI {
        return {
            nameRecorded: false,
            phoneRecorded: false,
            resComplexId: null,
            geo: { geolocation: null, type: "empty"},
            content: {process: "notStarted", images: [], videos: []},
            description: null
        } 
    }

}

export default new SessionService()