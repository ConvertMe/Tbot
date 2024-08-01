import path from "path";

class OtherService {
    getPathToStorage(): string {
        return path.resolve(__dirname, "..", "..", "storage")
    }
}

export default new OtherService()