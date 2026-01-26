import jwt from "jsonwebtoken";

// Use the same secret as your authService.js
// In production, always use process.env.JWT_SECRET
const JWT_SECRET = process.env.JWT_SECRET || "yolo";

export function requireAuth(req, res, next)
{
    // 1. Get the Authorization Header
    const authHeader = req.headers.authorization;

    // 2. Check format: "Bearer <token_string>"
    if (!authHeader || !authHeader.startsWith("Bearer "))
    {
        return res.status(401).json({ error: "Access Denied: No Token Provided" });
    }

    const token = authHeader.split(" ")[1];

    try
    {
        // 3. Verify the Token
        // This checks if the token was tampered with or expired
        const decoded = jwt.verify(token, JWT_SECRET);
        console.log(decoded)

        // 4. Attach User Info to Request
        // This REPLACES the old "x-actor-id" middleware logic
        req.context = {
            actorId: decoded.userId,    // This allows controllers to know WHO is acting
            role: decoded.role,         // This allows controllers to check permissions
            branchId: decoded.branchId, // This locks operations to the specific store
            username: decoded.username,
            roleId: decoded.roleId
        };

        // 5. Proceed to the Controller
        next();

    } catch (err)
    {
        console.error("Auth Error:", err.message);
        return res.status(403).json({ error: "Invalid or Expired Token" });
    }
}