import dotenv from "dotenv"
import connectDB from "./db/index.js";
import {app} from './app.js'

dotenv.config({
    path: './.env'
})

const PORT = process.env.PORT || 8000;

connectDB()  
.then(() => {
    app.listen(PORT, () => {
        console.log(`⚙️ Server is running at port : ${PORT}`);
        console.log(`🌐 Frontend available at: http://localhost:${PORT}`);
        console.log(`🔌 API available at: http://localhost:${PORT}/api/v1`);
    })
})
.catch((err) => {
    console.log("MONGO db connection failed !!! ", err);
}) 