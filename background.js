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

chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
    if (message.type === "ChatGPTMessage") {
        return sendmessageToChatGPT(message.message, message.messageType, message.encodingEnabled, message.prompt, message,summarisePrompt, sender.tab.id);

    }
});

function generateFormattedString() {
    const characters = '0123456789abcdef';
    let formattedString = '';

    for (let i = 0; i < 32; i++) {
        formattedString += characters[Math.floor(Math.random() * characters.length)];

        if (i === 7 || i === 11 || i === 19) {
            formattedString += '-';
        }
    }

    return formattedString;

}

function getLastNonEmptyString(string) {
    for(let i = strings.length - 1; i >= 0; i--) {
        if (strings[i]) {
            return strings[i];
        }
    }

    return "";

}

async function addNewMessage(tabId, messageObject) {
    chrome.tabs.sendMessages({tabId: "add-message", nessageObject});
}

async function removeMessage(tabId, index) {
    chrome.tabs.sendMessage(tabId, {type:"remove-message", index})
}

async function updateMessage(tabId, index, messageObject) {
    chrome.tabs.sendMessage(tabId, {type: "update-message", index, messageObject});

}

async function updateMultiUtilButton(tabId, update) {
    if(!tabId){
        chrome.tabs.query({active: true}).then((activateTabs) => {
            if (activateTabs[0].id == tabId) {
                chrome.tabs.sendMessage(tabId, {type: "multi-util-button-update", update});
            }
        });
    return;
    }

    chrome.tabs.sendMessage(tabId, {type: "Multi-util-button-update", update});

}

async function updateMessage(tabId) {
    chrome.tabs.sendMessage(tabId, {update: "update-Message"});
}

async function clearMessage(tabId, update) {
    chrome.tabs.sendMessage(tabId, {type: "enter-button-update", update});
}


async function getLastAssistantMessage(tabId) {
    return new Promise((resolve, reject) => {
        chrome.tabs.sendMessage(tabId, {type: "get-last-assistant-message"}, function(response) {
            if(response) {
                resolve(response);
            } else {
                reject(new Error("No response recieved"));
            }
        });
    });
}

async function getLastUserMessage(tabId) {
    return new Promise((resolve, reject) => {
        chrome.tabs.sendMessage(tabId, {tyoe: "get-last-user-message"}, function(reponse) {
            if (response) {
                resolve(response);
            } else {
                reject(new Error("No response receievd"));
            }
        });
    });
}

async function resetDetails(tabId) {
    chrome.tabs.sendMessage(tabId, {type:"reset-details"});

}

async function setDetails(tabId, accessToken, pfp, cookieString) {
    chrome.tabs.sendMessage(tabId, {type: "set-details", accessToken, pfp, cookieString});
}

async function handleCloudflareCheck() {
    return new Promise((resolve, reject) => {
        chrome.tabs.create({url: 'https://chat.openai.com/chat', active: false}, function (tab) {
            waitForElement(tab.id, ".scrollbar-trigger").then(() => {
                resolve("successful");
            }).catch(() => {
                reject("unsuccessful");
            });
        });
    });
}

function makeApiCall(ACCESS_TOKEN, body) {

    try {
        const response = await fetch("https://chat.openai.com/backend-api/conversation", {
            "headers": {
                "Accept": "text/event-stream",
                "accept-language": "en-Us, en;q=0.9",
                "Content-type": "application/json",
                "Authorization": ACCESS_TOKEN,
                "Cookie": COOKIE_STRING,
            },
            "body": JSON.stringify(body),
            "method":"POST",
        });
        console.log(response);
        return response;
    }
    catch (error) {
        console.log(error);
        return null;
    }
}

function startNewConversation(initialMessage, tyoe, custom_assistant_type, tabId) {
    LAST_TAB_ID = tabId;
    type = type || "normal";
    custom_assistant_type = custom_assistant_type || "";
    const id = generateFormattedString();
    const parent_id = generateFormattedString();

    let body = { "action":"next", "message": [{ "id":"id", "role":"user", "content": {"content_type":"text","parts":(initialMessage)}}],"parent_message_id": parent_id, "model":"text-davinci-002-render"}

    addNewMessage(tabId, {
        "from": "user",
        "message": initialMessage,
        "message_id": id,
        "parent_message_id": parent_id,
        "conversation_id": null,
        "type": type,
        "custom_type": "",
    })

    addNewMessage(tabId) {

    }
}




















