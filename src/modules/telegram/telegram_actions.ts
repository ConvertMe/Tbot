import { Telegraf } from "telegraf"
import usersService from "./users/users"
import otherService from "../other/other.service"
import { pool } from "../db/db"
import { SelectResponseDBT } from "../db/types"
import sessionService from "./session/session.service"
import { ComplexI,  } from "./session/types"
import filesService from "../files/files.service"

export default class TelegramActions {

    private bot: Telegraf

    constructor(bot: Telegraf) {
        this.bot = bot
    }

    executeActions() {
        try {
            this.bot.action("geo", this.geo)
            this.bot.action("geodescription", this.geodescription)
            this.bot.action(/^geoSpot=/, this.geoSpot)
            this.bot.action(/^complexId=/, this.complexId)
            this.bot.action(/^sessionContent=/, this.sessionContent)
            this.bot.action("contendEnd", this.contendEnd)
            this.bot.on("location", this.location)
            this.bot.on('new_chat_members', this.handleNewChatMembers)
            this.bot.on('left_chat_member', this.handleLeftChatMemberasync)
            this.bot.on("photo", this.handlePhoto)
            this.bot.on('document', this.handleDocument)
            this.bot.on('video', this.handleVideo)
            this.bot.on("video_note", this.handleVideoNote)
        } catch (e) {
            otherService.writelog("error", e)
            console.log(e)
        }

    }

    private async contendEnd(ctx: any) {
        const user = await usersService.isAuth(ctx.chat.username)
        if(!user) return ctx.reply(`Извините, не нашёл вас в списке пользователей группы Амбассадоров ЖК, обратитесь к администратору группы`)
        const session = await sessionService.getSession(user) 
        session.session.content.process = "streamEnd"
        await sessionService.updateSession(session)


        //login to end
        return ctx.reply("end session")
    }

    private async sessionContent(ctx: any) {
        const user = await usersService.isAuth(ctx.chat.username)
        if(!user) return ctx.reply(`Извините, не нашёл вас в списке пользователей группы Амбассадоров ЖК, обратитесь к администратору группы`)
        const session = await sessionService.getSession(user)
        if (!ctx.callbackQuery && !ctx.callbackQuery.data) return
        const spot: "yes" | "no" = ctx.callbackQuery.data.split("=")[1] as "yes" | "no"
        session.session.content.process =  spot === "yes" ? "streamOn" : "streamEnd"
        await sessionService.updateSession(session)

        if(spot === "yes") ctx.reply(`Пришлите медиафайл (изображение или видео)`)
        if(spot === "no") ctx.reply(`Заявка сформированна`)
        return

    }

    private async location(ctx: any) {
        const user = await usersService.isAuth(ctx.chat.username)
        if(!user) return ctx.reply(`Извините, не нашёл вас в списке пользователей группы Амбассадоров ЖК, обратитесь к администратору группы`)
        const session = await sessionService.getSession(user)
        session.session.geo.type = "description"
        const location = ctx.message.location
        await pool.execute(`insert into queueForReverseGeocoding (chatId, userId, latitude, longitude) values (?,?,?,?)`, [ctx.chat.id, user.id, location.latitude, location.longitude])
        ctx.reply(`Выполняется загрузка координат, пожалуйста подождите...`)
        return
    }

    private async geo(ctx: any) {
        const user = await usersService.isAuth(ctx.chat.username)
        if(!user) return ctx.reply(`Извините, не нашёл вас в списке пользователей группы Амбассадоров ЖК, обратитесь к администратору группы`)
        const session = await sessionService.getSession(user)
        session.session.geo.type = "description"
        await pool.execute(`update session set session=? where userId = ?`, [session.session, session.user.id])
        ctx.reply("Подтверждаете что вы на месте инцидента?", {
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: "Да", callback_data: "geoSpot=yes" },
                        { text: "Нет", callback_data: "geoSpot=no" }
                    ]
                ]
            }
        })

    }

    private async geoSpot(ctx: any) {
        const callbackData = ctx.callbackQuery.data as string
        const user = await usersService.isAuth(ctx.chat.username)
        if(!user) return ctx.reply(`Извините, не нашёл вас в списке пользователей группы Амбассадоров ЖК, обратитесь к администратору группы`)
        if (!ctx.callbackQuery && !ctx.callbackQuery.data) return

        const spot: "yes" | "no" = callbackData.split("=")[1] as "yes" | "no"
        const session = await sessionService.getSession(user)
        session.session.geo.type = spot === "yes" ? "onSpot" : "geo"
        await sessionService.updateSession(session)

        ctx.reply('Поделитесь своим местоположением', spot === "yes" 
            ? {
            reply_markup: {
                keyboard: [
                    [
                        {
                            text: 'Поделиться местоположением',
                            request_location: true,
                        },
                    ],
                ],
                resize_keyboard: true,
                one_time_keyboard: true,
            },
        }
        : undefined)

        return
    }

   

    private async geodescription(ctx: any) {
        const user = await usersService.isAuth(ctx.chat.username)
        if (!user) return ctx.reply(`Извините, не нашёл вас в списке пользователей группы Амбассадоров ЖК, обратитесь к администратору группы`)
        const session = await sessionService.getSession(user)
        session.session.geo.type = "description"
        await pool.execute(`update session set session=? where userId = ?`, [session.session, session.user.id])
        ctx.reply("Пришлите текствое описание")
    }

    private async complexId(ctx: any) {
        const user = await usersService.isAuth(ctx.chat.username)
        if (!user) return ctx.reply(`Извините, не нашёл вас в списке пользователей группы Амбассадоров ЖК, обратитесь к администратору группы`)
        if (!ctx.callbackQuery && !ctx.callbackQuery.data) return
        const complexId = Number(ctx.callbackQuery.data.split("=")[1])
        if (complexId === 0) {

            const complexesButtom = await sessionService.getComplexes()
            ctx.reply(`${user.name || ctx.chat.username} выберите пожалуйста, ЖК в который хотите оставить заявку`, complexesButtom)

            return
        } else {
            const complex: ComplexI = await pool.execute('select * from complex where id = ?', [complexId]).then((r: SelectResponseDBT<ComplexI>) => r[0][0])
            const session = await sessionService.getSession(user)

            await sessionService.updateUsersValues("lastResComplexId", String(complex.id), session)
            const next = sessionService.reactToGeo()
            ctx.reply(next.msg, next.buttons)
            return
        }
    }

    private async handleNewChatMembers(ctx: any) {

        try {
            try {
                await this.cheackAdminForGroup(ctx)
            } catch (e) {
                return ctx.reply(`В этой группе я работать не буду!`)
            }
            
            for (let i = 0; i < ctx.message.new_chat_members.length; i++) {
                if (ctx.message.new_chat_members[i].username) await usersService.createUser({ login: ctx.message.new_chat_members[i].username!, phone: null })
                ctx.reply(`Добро пожаловать, ${ctx.message.new_chat_members[i].username}!`)
            }

        } catch (e) {
            throw e
        }
    }

    private async handleLeftChatMemberasync(ctx: any) {

        try {
            await this.cheackAdminForGroup(ctx)
        } catch (e) {
            return ctx.reply(`В этой группе я работать не буду!`)
        }

        const member = ctx.message.left_chat_member
        if (member.username) {
            await usersService.deleteUser(member.username!)
            ctx.reply(`Прощай, ${member.username}! Мы будем скучать!`)
        }
    }



    private async handlePhoto(ctx: any) {

        const user = await usersService.isAuth(ctx.chat.username)
        if (!user) return ctx.reply(`Извините, не нашёл вас в списке пользователей группы Амбассадоров ЖК, обратитесь к администратору группы`)
        const session = await sessionService.getSession(user)
        if(session.session.content.process !== "streamOn") return sessionService.toReact(ctx)
        
        
        if (ctx.update && ctx.update.message && ctx.update.message.photo && Array.isArray(ctx.update.message.photo)) {
            const file_id = ctx.update.message.photo[ctx.update.message.photo.length - 1]["file_id"]
            
            await filesService.saveFile("img", file_id, session)

            return ctx.reply(`Файл сохранён!\nПришлите медиафайл (изображение или видео)`, {            
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: "Завершить", callback_data: "contendEnd" },
                        ]
                    ]
                }})
        }
        return ctx.reply("Файл не опознан")
    }

    private async handleDocument(ctx: any) {

        const fileId = ctx.message.document.file_id

        const user = await usersService.isAuth(ctx.chat.username)
        if (!user) return ctx.reply(`Извините, не нашёл вас в списке пользователей группы Амбассадоров ЖК, обратитесь к администратору группы`)
        const session = await sessionService.getSession(user)
        if(session.session.content.process !== "streamOn") return sessionService.toReact(ctx)

        const fileName = ctx.message.document.file_name
        const fileExtension = fileName.split('.').pop().toLowerCase()

        if (fileExtension === 'png' || fileExtension === 'jpg' || fileExtension === 'jpeg' || 'mp4' || "webm") {
            switch(fileExtension) {
                case "png": await filesService.saveFile("img", fileId, session); break
                case "jpg": await filesService.saveFile("img", fileId, session); break 
                case "mp4": await filesService.saveFile("video", fileId, session); break 
                case "webm": await filesService.saveFile("video", fileId, session); break
                default: break 
            }
            return ctx.reply(`Файл сохранён!\nПришлите медиафайл (изображение или видео)`, {            
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: "Завершить", callback_data: "contendEnd" },
                        ]
                    ]
                }})

        } else return ctx.reply('❌ Формат файла не поддерживается.')
    }

    private async handleVideo(ctx: any) {
        const user = await usersService.isAuth(ctx.chat.username)
        if (!user) return ctx.reply(`Извините, не нашёл вас в списке пользователей группы Амбассадоров ЖК, обратитесь к администратору группы`)
        const session = await sessionService.getSession(user)
        if(session.session.content.process !== "streamOn") return sessionService.toReact(ctx)

        const fileId = ctx.message.video.file_id
        const fileName = ctx.message.video.file_name || 'video.mp4'
        const fileExtension = fileName.split('.').pop().toLowerCase()

        const supportedVideoFormats = ['mp4', 'webm', 'avi', 'mov', 'mkv', 'flv', 'wmv', 'mpeg']

        if (supportedVideoFormats.includes(fileExtension)) {

            await filesService.saveFile("video", fileId, session)

            return ctx.reply(`Файл сохранён!\nПришлите медиафайл (изображение или видео)`, {            
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: "Завершить", callback_data: "contendEnd" },
                    ]
                ]
            }})
        } else {
            return ctx.reply('❌ Формат видео не поддерживается.')
        }
    }

    private async handleVideoNote(ctx: any) {

        const user = await usersService.isAuth(ctx.chat.username)
        if (!user) return ctx.reply(`Извините, не нашёл вас в списке пользователей группы Амбассадоров ЖК, обратитесь к администратору группы`)
        const session = await sessionService.getSession(user)
        if(session.session.content.process !== "streamOn") return sessionService.toReact(ctx)

        if (!ctx || !ctx.message.video_note) {
            return ctx.reply('❌ Ошибка: контекст или видеозаметка не определены.')
        }

        const fileId = ctx.message.video_note.file_id
        await filesService.saveFile("video", fileId, session)

        return ctx.reply(`Файл сохранён!\nПришлите медиафайл (изображение или видео)`, {            
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: "Завершить", callback_data: "contendEnd" },
                    ]
                ]
            }})
    
    }

    private async cheackAdminForGroup(ctx: any) {
        try {
            const chatId = ctx.chat.id
            const admins = await ctx.telegram.getChatAdministrators(chatId)

            if (admins.length > 0) {
                let adminVerify = false
                admins.forEach((admin: any) => {
                    if (admin.user.username === process.env.ROOT_TG_USER_LOGIN) return adminVerify = true
                })

                if (!adminVerify) throw new Error()
                ctx.reply("Админ")
            } else {
                throw new Error()
            }
        } catch (error) {
            throw new Error()
        }
    }

}