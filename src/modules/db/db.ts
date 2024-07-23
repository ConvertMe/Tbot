import mysql from 'mysql2/promise'
import config from './dbconfig'

export const pool = mysql.createPool(config)

export const connection = mysql.createConnection(config)

