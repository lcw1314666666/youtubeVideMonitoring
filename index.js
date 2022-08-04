const fs = require('fs')
const puppeteer = require('puppeteer');
const nodemailer = require('nodemailer');
const { getJSONList, setJSONList, transporter, scrollTimer, waitForFile, waitFileDownload } = require('./utils/index')
const { updateTop, updateAll } = require('./utils/update.js') // 更新数据
const { uploadFile } = require('./uploadVideo.js')
// const { main } = require('./utils/main.js');

Date.prototype.Format = function (fmt) { // author: meizz
    var o = {
        "M+": this.getMonth() + 1, // 月份
        "d+": this.getDate(), // 日
        "h+": this.getHours(), // 小时
        "m+": this.getMinutes(), // 分
        "s+": this.getSeconds(), // 秒
        "q+": Math.floor((this.getMonth() + 3) / 3), // 季度
        "S": this.getMilliseconds() // 毫秒
    };
    if (/(y+)/.test(fmt))
        fmt = fmt.replace(RegExp.$1, (this.getFullYear() + "").substr(4 - RegExp.$1.length));
    for (var k in o)
        if (new RegExp("(" + k + ")").test(fmt)) fmt = fmt.replace(RegExp.$1, (RegExp.$1.length == 1) ? (o[k]) : (("00" + o[k]).substr(("" + o[k]).length)));
    return fmt;
}

;(async () => {
    let api = 'https://www.youtube.com/channel/UCMUnInmOkrWN4gof9KlhNmQ/videos?view=0&sort=dd&shelf_id=0' // 站外链接

    const browser = await puppeteer.launch({
        slowMo: 100,    //放慢速度
        headless: false,
        defaultViewport: {width: 1440, height: 780},
        ignoreHTTPSErrors: false, //忽略 https 报错
    });
    const page = await browser.newPage();
    await page.goto(api);


    // 上传视频测试
    // await uploadFile(browser, {
    //     videoName: '【震撼】這就是目前人類最高的科技水平，超出你想像的詹姆斯韋伯空間望遠鏡 | 老高與小茉 Mr & Mrs Gao',
    //     videoUrl: 'https://www.youtube.com/watch?v=toK9rcrRzlk',
    //     videoCover: 'https://i.ytimg.com/vi/toK9rcrRzlk/maxresdefault.jpg?sqp=-oaymwEcCPYBEIoBSFXyq4qpAw4IARUAAIhCGAFwAcABBg==&rs=AOn4CLCxrKql50GqtMvKq0WZohgKN_yUpg',
    //     videoPath: 'C:\\Users\\1\\Downloads\\【震撼】這就是目前人類最高的科技水平，超出你想像的詹姆斯韋伯空間望遠鏡 _ 老高與小茉 Mr & Mrs Gao.mp4'
    // })

    // const videoList = await updateTop(page) // 更新最新
    // const videoList = await updateAll(page) // 全部更新
    // console.log(videoList)

    const updateTimer = setInterval(async function () {
        const newVideoList = await updateTop(page) // 获取最新视频列表
        console.log(newVideoList)

        const historyVideo = await getJSONList('newestVideo.json') // 获取历史视频

        const newVideoUrl = newVideoList[0].videoUrl // 视频链接
        const newVideoName = newVideoList[0].videoName

        if (historyVideo.newestVideo !== undefined && historyVideo.newestVideo !== newVideoName) { // 有新视频
            console.log('有新视频！' + newVideoName, new Date().Format("yyyy-MM-dd hh:mm:ss"))
            clearInterval(updateTimer) // 如果有新视频清理掉定时器

            // await page.click('#video-title').then(async () => {
            //      newVideoUrl = await page.url()
            // }); // 点击获取最新视频链接

            // 发送邮箱提示
            let mailOptions = {
                from: '1820566696@qq.com', // sender address
                to: '1820566696@qq.com', // list of receivers
                subject: `老高最新视频${newVideoName}更新`, // Subject line
                // 发送text或者html格式
                // text: 'Hello world?', // plain text body
                html: `<b>${newVideoName}<span>视频地址：${newVideoUrl}</span>></b>` // html body
            };

            // 发送邮箱
            transporter.sendMail(mailOptions, (error, info) => {
                if (error) {
                    return console.log(error);
                }
                console.log('邮件发送成功', info.messageId);
                // Message sent: <04ec7731-cc68-1ef6-303c-61b0f796b78f@qq.com>
            });

            // 下载新视频并上传

            const downloadPage = await browser.newPage();
            await downloadPage.goto('https://en.savefrom.net/181/', {// 跳转视频下载网站
                waitUntil: 'load', // Remove the timeout
                timeout: 60 * 1000
            })

            await downloadPage.type('#sf_url', newVideoUrl, {delay: 20}) // 填写下载地址
            await downloadPage.click('#sf_submit')
            await downloadPage.waitForSelector('#sf_result'); // 等待下载链接加载完毕

            await downloadPage.waitForSelector('#sf_result .info-box .meta .title');
            const downloadfileName = await downloadPage.$eval('#sf_result .info-box .meta .title',e => e.title); // 获取下载文件名称
            console.log(downloadfileName, 'downloadfileName')

            await downloadPage.waitForSelector('.def-btn-box > a.link-download');
            await downloadPage.click('.def-btn-box > a.link-download') // 点击下载

            const filePath = `C:\\Users\\1\\Downloads\\${downloadfileName}.mp4`.replace(/\-/g, '_') // 下载文件路径

            // 等待文件下载完毕
            const fileDownloadState = await waitFileDownload(filePath)
            if (fileDownloadState) {
                console.log('文件上传完毕')
                // 更新json文件
                await setJSONList('newestVideo.json', { newestVideo: newVideoName })
                // 整理下载视频信息
                const newVideoObj = {
                    videoName: newVideoList[0].videoName,
                    videoUrl: newVideoList[0].videoUrl,
                    videoCover: newVideoList[0].videoCover,
                    videoPath: filePath
                }
                // 上传视频
                await uploadFile(browser, newVideoObj)
            }

            await page.goto(api) // 返回主页
            // setInterval(main, 30 * 1000)
        } else {
            console.log('无新视频,继续刷新页面！', new Date().Format("yyyy-MM-dd hh:mm:ss"))
            await page.reload()
        }
    }, 30 * 1000)
})();
