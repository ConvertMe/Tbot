import mysql from "mysql2"

interface SelectResponseDBI <T = any> {
    rows: T[]
    fields: mysql.FieldPacket[]
}

interface InsertResponseDBI {
    insertId: number
    affectedRows: number
    warningCount: number
    changedRows?: number
}

interface UpdateResponseDBI {
    affectedRows: number
    changedRows?: number
    warningCount: number
}

interface DeleteResponseDBI {
    affectedRows: number
    warningCount: number
}