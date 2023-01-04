const fs = require("fs");

const writeLog = (message) => {
        let date = new Date();
        let __message = `${date.toISOString()}: ${message}`
        console.log(__message);
        fs.appendFile("log.txt",__message + "\n",(err) => {
            if(err) {
                console.log(err);
            }
        });
}


module.exports = writeLog;