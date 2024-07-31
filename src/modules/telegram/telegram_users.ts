import { pool } from "../db/db"

class TelegramUsers {

  async createUser(data: { phone: string | null, login: string, role?: string }) {
    try {
      const [result] = await pool.query('INSERT INTO users (phone, login, role) VALUES (?, ?, ?)',
        [data.phone, data.login, data.role || 'user'])
      return result
    } catch (e) {
      console.log(e)
      throw e
    }
  }

  async getUserById(id: number) {
    try {
      const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [id])
      return Array.isArray(rows) ? rows[0] : null
    } catch (e) {
      throw e
    }
  }

  async getAllUsers() {
    try {
      const [rows] = await pool.query('SELECT  FROM users')
      return rows
    } catch (e) {
      throw e
    }
  }

  async updateUser(id: number, data: Partial<{ phone: string, login: string, role: string, isDisabled: boolean }>) {
    try {
      const [result] = await pool.query('UPDATE users SET phone = ?, login = ?, role = ?, isDisabled = ? WHERE id = ?',
        [data.phone, data.login, data.role, data.isDisabled, id])
      return result
    } catch (e) {
      throw e
    }
  }

  async deleteUser(login: string) {
    try {
      const result: any = await pool.query('DELETE FROM users WHERE login = ?', [login])
      return result[0].affectedRows > 0
    } catch (e) {
      console.log(e)

      throw e
    }
  }
}

export default new TelegramUsers()