const fs = require('fs')
const puppeteer = require('puppeteer');
const nodemailer = require('nodemailer');
// const transporter = require('./sendMail.js')

(async () => {
    let api = 'https://www.youtube.com/channel/UCMUnInmOkrWN4gof9KlhNmQ/videos?view=0&sort=dd&shelf_id=0' // 站外链接

    let transporter = nodemailer.createTransport({
        // host: 'smtp.ethereal.email',
        service: 'qq', // 使用了内置传输发送邮件 查看支持列表：https://nodemailer.com/smtp/well-known/
        port: 465, // SMTP 端口
        secureConnection: true, // 使用了 SSL
        auth: {
            user: '1820566696@qq.com',
            // 这里密码不是qq密码，是你设置的smtp授权码
            pass: 'mvjeoapjantyefbh',
        }
    });

    // 读取JSON文件
    function getDownloadList() {
        return new Promise((resolve, reject) => {
            fs.readFile('newestVideo.json', 'utf-8', (err, data) => {
                if (err) {
                    reject(err)
                }
                const downloadList = JSON.parse(data.toString())

                resolve(downloadList)
            })
        })
    }

    // 写入JSON文件
    async function setDownloadList(newDownload) {
        // const historyDown = await getDownloadList() // 获取历史下载文件记录
        const downloadList = JSON.stringify(newDownload)
        return new Promise((resolve, reject) => {
            fs.writeFile('newestVideo.json', downloadList, (err) => {
                if (err) {
                    console.log(err)
                    reject(err)
                }
                resolve(downloadList)
            })
        })
    }

    const browser = await puppeteer.launch({
        slowMo: 100,    //放慢速度
        headless: false,
        defaultViewport: {width: 1440, height: 780},
        ignoreHTTPSErrors: false, //忽略 https 报错
    });
    const page = await browser.newPage();
    await page.goto(api);

    setInterval(async function () {
        console.log('获取最新视频信息')
        // 使用css选择器的方式获取页面中的数据

        const newVideo = await page.$eval('#video-title',e => e.textContent);

        const historyVideo = await getDownloadList() // 获取历史视频

        let newVideoUrl = '' // 视频链接

        console.log(historyVideo.newestVideo, newVideo)
        if (historyVideo.newestVideo !== undefined && historyVideo.newestVideo !== newVideo) { // 有新视频
            console.log('有新视频！')

            await page.click('#video-title').then(async () => {
                 newVideoUrl = await page.url()
            }); // 点击获取最新视频链接

            // 发送邮箱提示
            let mailOptions = {
                from: '1820566696@qq.com', // sender address
                to: '1820566696@qq.com', // list of receivers
                subject: `老高最新视频${newVideo}更新`, // Subject line
                // 发送text或者html格式
                // text: 'Hello world?', // plain text body
                html: `<b>${newVideo}<span>视频地址：${newVideoUrl}</span>></b>` // html body
            };

            // 发送邮箱
            // transporter.sendMail(mailOptions, (error, info) => {
            //     if (error) {
            //         return console.log(error);
            //     }
            //     console.log('邮件发送成功', info.messageId);
            //     // Message sent: <04ec7731-cc68-1ef6-303c-61b0f796b78f@qq.com>
            // });

            // 下载新视频并上传

            const downloadPage = await browser.newPage();
            await downloadPage.goto('https://en.savefrom.net/181/') // 跳转视频下载网站

            await downloadPage.type('#sf_url', newVideoUrl, {delay: 100})
            await downloadPage.click('#sf_submit')
            await downloadPage.waitForSelector('#sf_result'); // 等待下载链接加载完毕
            await downloadPage.waitForSelector('.def-btn-box > a.link-download');
            await downloadPage.click('.def-btn-box > a.link-download')

            // 更新json文件
            setDownloadList({ newestVideo: newVideo })
            await page.goto(api) // 返回主页
        } else {
            console.log('无新视频,继续刷新页面！')
            await page.reload()
        }

    }, 30 * 1000)
})();
