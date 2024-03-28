import express from "express"
import cookieParser from "cookie-parser"
import cors from "cors"

const app = express()

app.use(cors({
    origin : process.env.CORS_ORIGIN,
    credentials: true,

}));

app.use(express.json({limit:"16kb"}))
// server gets data via url | json. above is the way to accept json and we have given size limit of json
app.use(express.urlencoded({extended:true,limit:"16KB"}))
//above is used for decoding data coming from url. eg divya prasad in url will be divya+prasad or divya%20%prasad so code will understand that
app.use(express.static("public"))
// to store mediafiles like images
app.use(cookieParser())
// to get and set cookie from client and manipulate that

export { app }