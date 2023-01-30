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

    const json = await response.json();

    if (json.details === "Rate limit exceeded") {
        return {error: json.details};
    }

    const accessToken = json.accessToken;

    const pfp = json.user.image;

    return {accessToken, pfp};
}

// another function
function handleTabUpdate(tabId, changeInfo, tab) {
    if(tab.url.indexof("youtube.com") > -1 && tab.url.indexOf("/watch?v=") > -1) { // check if change has occurred of not
        if(changeInfo.url) { // check if tab url changed
            chrome.tabs.query({ active: true }).then((activateTabs) => {
                if (activateTabs[0].id === tabId) {
                    waitForElement(tabId, "#above-the-fold > #title").then(() => {
                        chrome.tabs.sendMessage(tabId, {type: "handleYouTubeChange", url: tab.url});
                        chrome.runtime.reload();
                    })
                }
            });
        }

    }

}

chrome.tabs.onUpdated.addListener(handleTabUpdate);


function waitForElement(tabId, selector) {

    function getElement(selector) {
        return JSON.stringify(!document.querySelector(`${selector}`))
    }

    return new Promise((resolve, reject) => {
        const checkInterval = setInterval(() => {
            chrome.scripting.executeScript({
                target: {tabId: tabId},
                args: [selector],
                func: getElement,
            }).then((result) => {
                if (JSON.stringify(result[0].result).indexOf("true") > -1) {
                    clearInterval(checkInterval);
                    resolve();
                }
            });
        }, 500);

        setTimeout(() => {
            clearInterval(checkInterval);
            reject();
        }, 60000);
    });

}























