module.exports = {
    USER_URL: "https://210.242.90.110:8800/login/",
    WH_HOST: 'http://localhost/whmcs/',
    VZ_HOST: 'https://10.88.90.5:5000/',
    WH_API_ENDPOINT: 'includes/api.php',
    VZ_API_ENPOINT: '/v3/',
    VOLUME_SIZE: "64",
    DESTINATION_TYPE: "volume",
    logLevel: 'log',
    logPath: 'log',
    QUOTA_RAM: 4096,
    QUOTA_CORES: 2,
    USER_TEMPLATE: `
    Hi {0},

    Please login with following details.

    Url  : {1}

    Domain : {2}

    Username :  {3}

    Password :  {4}

    Thanks

    Comboware inc.`
}