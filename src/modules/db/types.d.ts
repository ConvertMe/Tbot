import mysql from "mysql2"

export type SelectResponseDBT <T = any> = [rows: T[], fields: mysql.FieldPacket[]]

export type InsertResponseDBT = [rows: {
    insertId: number
    affectedRows: number
    warningCount: number
    changedRows?: number
}, fields: mysql.FieldPacket[]]

export type UpdateResponseDBT = [rows: {
    affectedRows: number
    changedRows?: number
    warningCount: number
}, fields: mysql.FieldPacket[]]

export type DeleteResponseDBT = [rows: {
    affectedRows: number
    warningCount: number
}, fields: mysql.FieldPacket[]]
