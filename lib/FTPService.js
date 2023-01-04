const Client = require('ftp');
const fs = require("fs");
const writeLog = require("./LogService")
const c = new Client();

let __toBackup = [];
let __localBackups = [];

let __config = {
    "host": process.env.FTP_HOST,
    "port": process.env.FTP_PORT,
    "user": process.env.FTP_USER,
    "password": process.env.FTP_PASSWORD
};

const triggerBackup = () => {
    writeLog("Backup job triggered, looking for new files.");
    checkLocal();
}


/*
First get current local backups to avoid duplicates
 */
const checkLocal = () => {
    fs.readdir(process.env.LOCAL_PATH, (err, files) => {
        for (const file of files) {
            __localBackups.push(file);
        }
        writeLog("Following files detected locally, so not backing up again: " + __localBackups)
    });
};

/*
Connect to FTP Server, pull list of backups and only save the backups which are not locally saved to the LOCAL_PATH
 */

c.on('ready', () =>  {
    c.cwd("praxis", () => {
        c.list((err, list) => {
            for (let file of list) {
                if(!__localBackups.includes(file.name)){
                    __toBackup.push(file.name);
                }
            }
            if(__toBackup.length > 0){
                writeLog("Following files will get backed up: " + __toBackup);
                for(let file of __toBackup){
                    c.get(`${process.env.REMOTE_PATH}${file}`, false,(err, stream) => {
                        writeLog("Backing up " + file);
                        if(err){
                            throw err;
                        }
                        stream.once('close', () => c.end());
                        stream.pipe((fs.createWriteStream(`${process.env.LOCAL_PATH}${file}`)));
                    });
                }
            } else {
                writeLog("No files to be backed up.");
            }
            c.end();
        });
    });
});
c.connect(__config);

module.exports = triggerBackup
