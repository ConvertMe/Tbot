import mysql from "mysql2/promise"
import config from "../db/dbconfig"

class TelegramUsers {

    async createUser(data: { phone: string, login: string, role?: string }) {
        const [result] = await pool.query('INSERT INTO users (phone, login, role) VALUES (?, ?, ?)', 
          [data.phone, data.login, data.role || 'user']);
        return result;
      }
    
      async getUserById(id: number) {
        const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [id]);
        return rows[0];
      }
    
      async getAllUsers() {
        const [rows] = await pool.query('SELECT  FROM users');
        return rows;
      }
    
      async updateUser(id: number, data: Partial<{ phone: string, login: string, role: string, isDisabled: boolean }>) {
        const [result] = await pool.query('UPDATE users SET phone = ?, login = ?, role = ?, isDisabled = ? WHERE id = ?', 
          [data.phone, data.login, data.role, data.isDisabled, id]);
        return result;
      }
    
      async deleteUser(id: number) {
        const [result] = await pool.query('DELETE FROM users WHERE id = ?', [id]);
        return result.affectedRows > 0; // Возвращает true, если пользователь был удалён
      }
    }

export default new TelegramUsers()