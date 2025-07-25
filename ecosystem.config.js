module.exports = {
    apps: [
        {
            name: "Auto Gallery Mobile API Server",
            script: "./mobile_api/index.js",
            out_file: "./logs/mobile_api_out.log",
            error_file: "./logs/mobile_api_error.log",
            restart_delay: 3000,
            time: true,
            env: {
                NODE_ENV: "production",
            }
        },
        
    ]
}
