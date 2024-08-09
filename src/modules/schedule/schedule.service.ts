import schedule from "node-schedule"
import dotenv from "dotenv"
import { unlinkSync } from "fs";
import otherService from "../other/other.service"
import { pool } from "../db/db";
import { SelectResponseDBT } from "../db/types";
import { QueueForReverseGeocodingI } from "./types";
import axios from "axios";
import { UserI } from "../telegram/users/types";
import sessionService from "../telegram/session/session.service";
import { GarbageСollectorFilesI } from "../files/types";
dotenv.config()

export default class ScheduleService {

    constructor() {
        schedule.scheduleJob('* * * * * *', async () => {
            try {
                await this.startQueueForReverseGeocoding()
            } catch (e) {
                otherService.writelog("error", e)
            }
        })

        schedule.scheduleJob('* * 0 * * *', async () => {
            try {
                await this.garbageСollectorFiles()
            } catch (e) {
                otherService.writelog("error", e)
            }
        })
    }

    private async startQueueForReverseGeocoding() {
        try {
            const parseGeo = async (latitude: string, longitude: string): Promise<string> => {
                try {
                    const response = await axios.get('https://nominatim.openstreetmap.org/reverse', {
                        params: {
                            lat: latitude,
                            lon: longitude,
                            format: 'json',
                            accept_language: 'ru'
                        }
                    })

                    if (!response.data.display_name) throw new Error('invalid parse geo')
                    return response.data.display_name as string
                } catch (e: any) {
                    throw e
                }
            }

            const queue: QueueForReverseGeocodingI | undefined = await pool.execute(`select * from queueForReverseGeocoding ORDER BY id DESC LIMIT 1`).then((r: SelectResponseDBT<QueueForReverseGeocodingI>) => r[0][0])
            if (!queue) return
            const adres = await parseGeo(queue.latitude, queue.longitude)
            await pool.execute(`delete from queueForReverseGeocoding where id = ?`, [queue.id]).then((r: SelectResponseDBT<QueueForReverseGeocodingI>) => r[0][0])
            const user = await pool.execute(`select * from users where id = ?`, [queue.userId]).then((r: SelectResponseDBT<UserI>) => r[0][0] as UserI)

            const session = await sessionService.getSession(user)
            await sessionService.updateSession({ ...session, session: { ...session.session, geo: { ...session.session.geo, geolocation: `Широта: ${queue.latitude}\n Долгота: ${queue.longitude}\n Адрес: ${adres}`}}})

            await this.sendMsg(queue.chatId)

        } catch (e) {
            throw e
        }
    }

    private async sendMsg(chatId: string) {
        try {
            await axios.post(`https://api.telegram.org/bot${process.env.TELEGRAM_TOKEN}/sendMessage`, {
                chat_id: chatId,
                text: `Геолокация записана!\n\nЗагружаем фото или видео контент?`,
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: "Да", callback_data: "sessionContent=yes" },
                            { text: "Нет", callback_data: "sessionContent=no" }
                        ]
                    ]
                },
                parse_mode: 'Markdown'
            })
        } catch (e) {
            throw e
        }
    }

    private async garbageСollectorFiles() {
        try {

            const files: GarbageСollectorFilesI[] = await pool.execute(`
                    SELECT *
                    FROM garbageСollectorFiles
                    `)
                    .then((r: SelectResponseDBT) => r[0])

            /* WHERE createdAt < NOW() - INTERVAL 1 DAY */
            for (let i = 0; i < files.length; i++) {
                try {
                    unlinkSync(files[i].pathToFile)
                } catch (e) {
                    
                } finally {
                    await pool.execute('delete garbageСollectorFiles where id = ?', [files[i].id])
                }
            }
        } catch (e) {
            throw e
        }
    }

}
