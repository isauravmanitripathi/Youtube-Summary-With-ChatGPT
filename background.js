const ChatGPT_URL = "https://chat.openai.com/chat";
const ChatGPT_Auth_Endpoint = "https://chat.openai.com/api/auth/session";
let Access_toke = "Bearer none";
let PFP = "";
let COOKIE_STRING = "";
const CHUNK_SIZE = 1600; // size limit
let conservation = null;
let LAST_TAB_ID;

chrome.runtime.onInstalled.addListener(function(){
    conservation = null;
    let ACCESS_TOKEN = "Bearer none";
    let PFP = "";
    let COOKIE_STRING = "";
});

const getAccessToken = async (cookieString) => {
    let response = await fetch(ChatGPT_Auth_Endpoint, {
        headers: {
            cookie: cookieString,
        },
    });

    const statusCode = await response.status;

    if(statusCode == 403) {
        try {
            console.log("cloudfare");
            const cloudflareStatus = await handleCloudflareCheck();
            await updateMuultiUtilButton(null, "refreshed");
            response = await fetch(ChatGPT_Auth_Endpoint, {
                headers: {
                    cookie: cookieString,
                },
            });
        } catch (error) {
            await updateMuultiUtilButton(null, "cloudfare-captcha");
            return {error: "Rate limit exceeded"}
        }
    }
}




















