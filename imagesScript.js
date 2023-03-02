import axios from 'axios';
import fs from 'fs';
import tokensWithoutImages from './tokensWithoutImages.json' assert { type: 'json' };
import tokensUrlMap from './tokensUrlMap.json' assert { type: 'json' };
import swappersWithoutImages from './swappersWithoutImages.json' assert { type: 'json' };
import swappersUrlMap from './swappersUrlMap.json' assert { type: 'json' };

const imageUrlRepo = 'https://api.rango.exchange/meta?apiKey=57e66bdb-07ae-4956-a117-7570276a02d6';

const meta = await axios.get(imageUrlRepo);

const tokens = meta.data.tokens;

const blockchains = meta.data.blockchains

const swappers = meta.data.swappers

const dirPath = './tokenImages/';
const swapperPath = './swapperImages/';

// await getTokenImages(0, 500);

// await getBlockchainImages();

await getSwapperImages();

async function getSwapperImages() {
     
    await Promise.all(swappers.map(async swapper => {
        const {id, title} = swapper
        const swapperDir = swapperPath + title.toUpperCase();

        if(!fs.existsSync(swapperDir)) {
            fs.mkdirSync(swapperDir);
        }

        await axios({
            method: 'get',
            url: swapper.logo,
            responseType: 'stream'
        }).then(function (response) {
            const fileType = response.headers['content-type'];
            let fileExtension = "." + fileType.split('/')[1]

            if(fileExtension.includes('octet')) {
                fileExtension = '.png';
            }
            else if(fileExtension.includes("+")) {
                fileExtension = '.svg';
            }

            const filePath = swapperDir + '/' + id + fileExtension

            if(!fs.existsSync(filePath)) {
                response.data.pipe(fs.createWriteStream(filePath));
            }

            if(!swappersUrlMap[title]) {
                swappersUrlMap[title] = {}
            }

            if(!swappersUrlMap[title].hasOwnProperty(id)) {
                swappersUrlMap[title][id] = 'https://raw.githubusercontent.com/DefiSpot/assets/main' + filePath.substring(1)
            }

        })
        .catch(function (error) {
            if(!swappersWithoutImages[title]) {
                swappersWithoutImages[title] = []
            }
            
            if(!swappersWithoutImages[title].includes(id)) {
                swappersWithoutImages[title].push(id)
            }

            if(!error.message.includes('404')) {
                console.log('name', id)
                console.log(console.log('error', error.message))
            }
        })

     }

    ))

    exportToJson('./swappersWithoutImages.json', swappersWithoutImages)
    exportToJson('./swappersUrlMap.json', swappersUrlMap)
} 

async function getBlockchainImages() {
     
    await Promise.all(blockchains.map(async blockchain => {
        const {name} = blockchain
        const blockchainDir = dirPath + name;

        if(!fs.existsSync(blockchainDir)) {
            fs.mkdirSync(blockchainDir);
        }

        await axios({
            method: 'get',
            url: blockchain.logo,
            responseType: 'stream'
        }).then(function (response) {
            const fileType = response.headers['content-type'];
            let fileExtension = "." + fileType.split('/')[1]

            if(fileExtension.includes('octet')) {
                fileExtension = '.png';
            }
            else if(fileExtension.includes("+")) {
                fileExtension = '.svg';
            }

            const filePath = blockchainDir + '/' + name + fileExtension

            if(!fs.existsSync(filePath)) {
                response.data.pipe(fs.createWriteStream(filePath));
            }

            if(!tokensUrlMap[name]) {
                tokensUrlMap[name] = {}
            }

            if(!tokensUrlMap[name].hasOwnProperty("logo")) {
                tokensUrlMap[name]["logo"] = 'https://raw.githubusercontent.com/DefiSpot/assets/main' + filePath.substring(1)
            }

        })
        .catch(function (error) {
            if(!tokensWithoutImages[name]) {
                tokensWithoutImages[name] = []
            }
            
            if(!tokensWithoutImages[name].includes("logo")) {
                tokensWithoutImages[name].push("logo")
            }

            if(!error.message.includes('404')) {
                console.log('name', name)
                console.log(console.log('error', error.message))
            }
        })

     }

    ))

    exportToJson('./tokensWithoutImages.json', tokensWithoutImages)
    exportToJson('./tokensUrlMap.json', tokensUrlMap)
} 

async function getTokenImages(start, end) {

    let tokensSlice = tokens.slice(start,end);

    if(start >= tokens.length) {
        console.log('done')
        return;
    }
    
    await Promise.all(tokensSlice.map(async token => {
        const blockchainDir = dirPath + token.blockchain

        if(!fs.existsSync(blockchainDir)) {
            fs.mkdirSync(blockchainDir);
        }

        const ticker =  getTicker(token)
            
        await axios({
            method: 'get',
            url: token.image,
            responseType: 'stream'
        })
        .then(function (response) {
            const fileType = response.headers['content-type'];
            let fileExtension = "." + fileType.split('/')[1]

            if(fileExtension.includes('octet')) {
                fileExtension = '.png';
            }
            else if(fileExtension.includes("+")) {
                fileExtension = '.svg';
            }

            const filePath = blockchainDir + '/' + ticker.replace('/', '') + fileExtension

            if(!fs.existsSync(filePath)) {
                response.data.pipe(fs.createWriteStream(filePath));
            }
                    
            if(!tokensUrlMap.hasOwnProperty(token.blockchain)) {
                tokensUrlMap[token.blockchain] = {};
            }

            if(!tokensUrlMap[token.blockchain].hasOwnProperty(ticker)) {
                tokensUrlMap[token.blockchain][ticker] = 'https://github.com/DefiSpot/assets/blob/main' + filePath.substring(1)
            }

        })
        .catch(function (error) {
            if(!tokensWithoutImages.hasOwnProperty(token.blockchain)) {
                tokensWithoutImages[token.blockchain] = [];
            }

            if(!tokensWithoutImages[token.blockchain].includes(ticker)) {
                tokensWithoutImages[token.blockchain].push(ticker)
            }

            if(!error.message.includes('404')) {
                console.log(console.log('error', error.message))
            }
        })
    }))
    
    await new Promise(resolve => setTimeout(()=>{
        console.log('batch ' + start + " - " + end + " done!")
        exportToJson('./tokensWithoutImages.json', tokensWithoutImages)
        exportToJson('./tokensUrlMap.json', tokensUrlMap)
        getImages(start + 500, end + 500)
    }, "5000"));
}

function getTicker(token) {
    return token.symbol + (token.address ? '-' + token.address : '')
}

function exportToJson(path, data) {
     fs.writeFile(path, JSON.stringify(data), (err) => {
            if (err) {
                console.log('Error writing file:', err);
                console.log('path', path);
                console.log('data', data);
            } 
     });
}

