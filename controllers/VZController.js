const config = require("../config");
require("dotenv").config();
var API = require("../utils.js");
const https = require("https");
const fs = require('fs');
const Logger = require("../logger");
const { EACCES } = require("constants");
// const Workspace = require("../models/Workspace");
const httpsAgent = new https.Agent({
  requestCert: true,
  rejectUnauthorized: false, // (NOTE: this will disable client verification)
  ca: fs.readFileSync("./server.cert")
});

const send = async (url, method, data, headers) => {
  // try{
    if (process.env.NODE_ENV === 'DEV') {
      return API.POST(url, data, { httpsAgent });
    }

    console.log("api Url called=======", url)
    console.log("post data===", JSON.stringify(data))
    switch (method) {
      case "GET":
        console.log("VZ === > headers", { httpsAgent, ...headers });
        return await API.GET(url, { httpsAgent, headers });
      case "POST":
        return await API.POST(url, data, { httpsAgent, headers });
      case "PUT":
        return await API.PUT(url, data, { httpsAgent, headers });
      case "DELETE":
        return API.DELETE(url);
        break;
      default:
        return null;
        break;
    }
  // }catch(err){
  //   Logger.logged().error(`request-> url = ${url}, method = ${method} ,Data = `,JSON.stringify(data),`response-> ${err} with error code ${err?.response?.data?.error?.code}`);
  // }
};

const serviceUrl = (endpoint, baseUrl) => {

  switch (endpoint) {
    case "/servers":
      return baseUrl + endpoint;
      break;
    case "/v3/getServer/":
      return baseUrl + "/servers/";
      break;
    default:
      return baseUrl + endpoint
      break;
  }

}

const getComputeUrl = (data, endPoint, isCompute) => {
  let type = typeof isCompute === 'boolean' ? 'compute' : isCompute;
  let finalData = data?.data?.token?.catalog?.filter(item => item?.type === type);

  console.log("finalData======", JSON.stringify(finalData))
  let baseUrl = finalData.length ? finalData[0]?.endpoints?.filter(point => point?.interface === 'public').reduce((a, c) => a.url + c.url) : null;
  console.log("baseUrl========", baseUrl)
  if (baseUrl?.url) {
    return baseUrl?.url + endPoint;
  }

  return null;
}


const getVZAuthToken = async (data, endPoint, isCompute, hostUrl) => {
  try {
    let clusterInfo = await API.getAnyTableData('clusters',` where cluster_url='${hostUrl}'`);
    // console.log('clusterInfo[0]',clusterInfo[0]);
    // let clusterInfo = '';
    let domainId = 'default';
    let username = clusterInfo[0]?.cluster_username || 'admin';
    let password = clusterInfo[0]?.cluster_password || process.env.VZ_PASSWORD;
    // let domainId = 'default';
    // let username = 'admin';
    // let password = process.env.VZ_PASSWORD;
    let projectName = 'admin';
    // console.log("data fro getting token---", data)
    // if(data!=undefined){
      if (data?.tokenType === 'user') {
        domainId = data?.domainId;
        username = data?.userName;
        password = data?.password;  // should be original means decrypted
        projectName = data?.projectName;
      }

      let json = {
        auth: {
          identity: {
            methods: ["password"],
            password: {
              user: {
                name: username,
                domain: {
                  id: domainId,
                },
                password: password,
              },
            },
          },
          scope: {
            project: {
              name: projectName,
              domain: {
                id: domainId,
              },
            },
          },
        },
      };
      let urlToPost = hostUrl + config.VZ_API_ENPOINT;
      console.log('urlToPost',urlToPost);
      let responseData = await send(
        urlToPost + "auth/tokens",
        "POST",
        json
      );
      let baseServiceUrl = endPoint;
      if (isCompute) {
        baseServiceUrl = getComputeUrl(responseData, endPoint, isCompute);
      }
      return { token: responseData?.headers["x-subject-token"], url: baseServiceUrl };
    // }else{
    //   return { token: '', url: '' };
    // }
  }catch(error){
    console.log('!!!!!!!!',error);
    return error;
  }
};

const getErrorCode = (response) => {
  if (
    response?.code === "ERR_HTTP_INVALID_HEADER_VALUE" ||
    response?.data?.error?.code === 401
  ) {
    return 401;
  } else if (response?.response?.data?.error?.code) {
    return response?.response?.data?.error?.code;
  } else {
    return 500;
  }
};

const VZApiHandler = async (data, apiEndPoint, method, token, isCompute,hostUrl) => {
  console.log('VZApiHandler->',data, apiEndPoint, method, token, isCompute,hostUrl);
  let ApiUrl = isCompute ? apiEndPoint : hostUrl + apiEndPoint;

  console.log("VZ token===", token);
  //console.log("VZ request data======", data, "method", method);

  return await send(ApiUrl, method, data, {
    "Content-type": "application/json",
    "x-auth-token": token,
  })
    .then((res) => {
      console.log("VZ data====&&&&&", res?.data);
      return { data: res?.data, status: 200 };
    })
    .catch((err) => {
      console.log("VZ Error==", err);
      
      let msg = err?.response?.data?.error?.message;
      Logger.logged().error(`request-> url = ${ApiUrl}, method = ${method} ,Data = `,JSON.stringify(data),`response-> ${msg} with error code ${err?.response?.data?.error?.code}`);
      return {
        data: err?.response?.data?.error?.code || err?.code,
        status: getErrorCode(err),
        message: msg
      };
    });
};

const Call = async (data, endpoint, method, isCompute, hostUrl) => {
  return new Promise(async (resolve, reject) => {
    try {
      // if (process.env.NODE_ENV === 'DEV') {
      //   let resultData =  await send(process.env.NODE_ENV_URL, method, { endpoint, data, method, isCompute, hostUrl });
      //   return resolve(resultData);
      // } else {

        console.log(endpoint, method, isCompute, hostUrl,"before passing final post data=================", data);
        let userData = data?.user;
        if (data?.user?.tokenType === 'user') {
          delete data['user'];
        }

        let { token, url, maindata } = await getVZAuthToken(userData, endpoint, isCompute, hostUrl);

        console.log(token,url,"passing final post data=================", data);
        let apiHandData = {};
        if(token !=undefined){
          apiHandData = await VZApiHandler(data, url, method, token, isCompute, hostUrl);
          console.log('api handker data -- ',apiHandData);
          return resolve(apiHandData);
        }else{
          return resolve(apiHandData.data='');
        }
      // }
    } catch (error) {
      console.log(error);
      // throw new Error(error);
      reject(error);
    }
  });
};

const ClusterVerification = async (data, hostUrl) => {
  return new Promise(async (resolve, reject) => {
    try {
        let userData = data?.user;

        let { token} = await getVZAuthToken(userData, '', false, hostUrl);
        return resolve(token || '');
    } catch (error) {
      console.log(error);
      // throw new Error(error);
      reject("Unable to verify the cluster. Please make sure cluster is accessible with the given details.");
    }
  });
};
module.exports = { Call, ClusterVerification };
