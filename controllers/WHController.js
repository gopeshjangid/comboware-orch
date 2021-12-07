const config = require("../config");
require('dotenv').config();
var API = require("../utils.js");
const https = require("https");
const { response } = require("express");
const httpsAgent = new https.Agent({
  rejectUnauthorized: false, // (NOTE: this will disable client verification)
})


const send = async (url, method, data ,headers) => {
  switch (method) {
    case "GET":
    console.log("headers" ,{httpsAgent ,...headers})
      return await API.GET(url,{httpsAgent, headers});
    case "POST":
      return API.POST(url, data ,{httpsAgent ,headers});
    case "PUT":
      return API.PUT(url, data);
    case "DELETE":
      return API.DELETE(url);
      break;
    default:
      return null;
      break;
  }
};

const getVZAuthToken = async(req,res) =>{

       let json  = {
      "auth": {
        "identity": {
          "methods": [
            "password"
          ],
          "password": {
            "user": {
              "name": "admin",
              "domain": {
                "id": "default"
              },
              "password": process.env.VZ_PASSWORD
            }
          }
        },
        "scope": {
          "project": {
            "name": "admin",
            "domain": {
              "id": "default"
            }
          }
        }
      }
    };
    console.log("cookieee-" ,req.cookies)

    let responseData = await send(config.VZ_HOST+config.VZ_API_ENPOINT+"auth/tokens",'POST' ,json);
    let  {headers}  = responseData;
    
     res
    .cookie("vz_token", responseData?.headers['x-subject-token'], {
      maxAge : 864000
    })

    return responseData?.headers['x-subject-token'];

}


const getErrorCode = (response) =>{
   if(response?.code === 'ERR_HTTP_INVALID_HEADER_VALUE' || response?.data?.error?.code === 401){
     return 401;
   } else {
     return 500
   }
}

const VZApiHandler = async (action ,method , data ,token) => {

       let ApiUrl = config.VZ_HOST;
       console.log("token===" ,token);
       console.log("reuest data======" ,data ,"method" ,method)
       return await send(ApiUrl+action, method, data ,{'Content-type' : 'application/json' ,'x-auth-token' : token}).then(res =>{
         console.log("data====&&&&&",res?.data)
         return {data : res?.data ,status : 200}
       }).catch(err =>{
         console.log("Error==",err?.response?.data)
         return {data : err?.response?.data?.error?.message || err?.code, status: getErrorCode(err)}
       })
};

const callApi = async (req ,res) => {
  let {
    query: { action, type },
    body,
    method,
  } = req;
  switch (type) {
    case "WH":
      let url = config.WH_HOST + config.WH_API_ENDPOINT;

      let data = {
        username: process.env.WH_ADMIN,
        password: process.env.WH_PASSWORD,
        action: action,
        responsetype: "json",
        ...body,
      };

      const params = new URLSearchParams(data);
      const str = params.toString();
      return await send(url, "POST", str);
    case "VZ":

    console.log("body====",body)
       let response  = await VZApiHandler(action , method, body ,req.cookies['vz_token']);
       console.log("old token==",req.cookies["vz_token"])
       console.log("response from api" ,response?.status)
       if(response?.status === 401 || !req.cookies['vz_token']){
            let token =  await getVZAuthToken(req,res);
            console.log("token renewed" ,token)
           let responseData  = await VZApiHandler(action , method, body ,token);
           return responseData
       }  else {
         return response;
       }
      break;

    default:
      return null;
      break;
  }
};
module.exports = { callApi };
