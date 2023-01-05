const Client = require('ftp');
const fs = require("fs");
const writeLog = require("./LogService");
const events = require('events');
const c = new Client();
const fileEvents = new events.EventEmitter();

let dirOutput = false;
let localFilesRead = false;

let __localBackupPaths = [];

let __config = {
    "host": process.env.FTP_HOST,
    "port": process.env.FTP_PORT,
    "user": process.env.FTP_USER,
    "password": process.env.FTP_PASSWORD
};

const triggerBackup = () => {
    writeLog("Backup job triggered, looking for new files.");

}

c.connect(__config);


/*
First get current local backups to avoid duplicates
 */
const checkLocal = (path, num) => {
    let checkPath = path ? `${process.env.LOCAL_PATH}${path}` : `${process.env.LOCAL_PATH}`;
    let pathTemp = path ? path : "";
    fs.readdir(checkPath, (err, files) => {
        for (const entry of files) {
            if (isDir(`${checkPath}/${entry}`)) {
                checkLocal(`${pathTemp}/${entry}`, num);
            } else {
                path ? __localBackupPaths.push(`${path}/${entry}`) : __localBackupPaths.push(`${entry}`);
            }

        }
    });
};


const adaptLocalStructure = (path) => {
    fs.readdir(`${process.env.LOCAL_PATH}${path}`, (err, files) => {
        if (err) {
            fs.mkdir(`${process.env.LOCAL_PATH}${path}`, () => console.log("Local folder created."));
        }
    });
}

/*
Connect to FTP Server, pull list of backups and only save the backups which are not locally saved to the LOCAL_PATH
 */

const backupDir = (path) => {
    adaptLocalStructure(path);
    c.cwd(path, () => {
        c.list(path, (err, list) => {
            let __toBackupFiles = [];
            for (let entry of list) {
                if (entry.type === 'd') {
                    backupDir(`${path}/${entry.name}`);
                } else if (entry.type === '-') {
                    let pathTemp = path ? `${path}/${entry.name}` : `${entry.name}`
                    if (__localBackupPaths.includes(pathTemp)) {
                        writeLog("Following file wont get backed up: " + pathTemp)
                    } else __toBackupFiles.push(entry.name);
                }
            }
            if (__toBackupFiles.length > 0) {
                writeLog("Following files will get backed up: " + __toBackupFiles);
                for (let file of __toBackupFiles) {
                    const fullpath = `${path}/${file}`;
                    c.get(`${fullpath}`, false, (err, stream) => {
                        writeLog("Backing up " + file);
                        if (err) {
                            throw err;
                        }
                        stream.once('close', () => {
                            c.end();
                            writeLog("Backup finished.")
                        });
                        stream.pipe((fs.createWriteStream(`${process.env.LOCAL_PATH}/${path}/${file}`)));
                    });
                }
            }

        })
    })
}

c.on('ready', () => {
    const path = process.env.REMOTE_PATH ? process.env.REMOTE_PATH : "";
    checkLocal();
    backupDir(path);
});


/*
Other functions needed
 */
function isDir(path) {
    try {
        let stat = fs.lstatSync(path);
        return stat.isDirectory();
    } catch (e) {
        // lstatSync throws an error if path doesn't exist
        return false;
    }
}


module.exports = triggerBackup
