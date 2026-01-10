import express from "express";

export function createServer()
{
    const app = express();
    app.use(express.json());
    app.get("/health", (req, res) =>
    {
        res.json({ status: "OkieDokieKariokie" });
    })
    return app;
}