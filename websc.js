const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const BASE_URL = "https://instrack.app/instagram/";
const users = ["kami4gaming", "non.adrenalin", "kamideresenpai"];
const dataFilePath = path.join(__dirname, 'followers_data.json');

// JSON dosyasını yükle veya yeni bir obje oluştur
const loadData = () => {
    if (fs.existsSync(dataFilePath)) {
        return JSON.parse(fs.readFileSync(dataFilePath, 'utf8'));
    }
    return {};
};

// JSON dosyasını kaydet
const saveData = (data) => {
    fs.writeFileSync(dataFilePath, JSON.stringify(data, null, 2));
};

// Takipçi sayısını çek
const fetchFollowers = async (username) => {
    const url = `${BASE_URL}${username}`;
    try {
        const browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
        
        // Dinamik içeriğin yüklenmesini bekle
        await page.waitForSelector('h4.font-weight-bolder.my-50', { timeout: 60000 });
        
        const followers = await page.$eval('h4.font-weight-bolder.my-50', (el) => el.textContent.trim());
        await browser.close();
        return parseInt(followers.replace(/,/g, ''), 10);
    } catch (error) {
        console.error(`Hata oluştu (${username}):`, error.message);
        return null;
    }
};
// Takipçi verilerini güncelle
const updateData = async () => {
    const data = loadData();
    const now = new Date();
    now.setHours(now.getHours() + 3); // GMT+3 ayarı
    const dateKey = now.toISOString().split('T')[0]; // YYYY-MM-DD
    const timeKey = now.toTimeString().split(':')[0] + ':00'; // HH:00

    if (!data[dateKey]) {
        data[dateKey] = {};
    }

    for (const username of users) {
        const followers = await fetchFollowers(username);
        if (!data[dateKey][username]) {
            data[dateKey][username] = {};
        }
        data[dateKey][username][timeKey] = followers;
        console.log(`${username}: ${followers} takipçi`);
    }

    saveData(data);
};

// Bot başlar başlamaz ilk veri çekimi
(async () => {
    console.log("Bot başlatılıyor...");
    await updateData(); // İlk veriyi al
    console.log("İlk veri alındı!");

    // Her saat başı veri çek
    setInterval(updateData, 60 * 60 * 1000);
})();