const fs = require('fs');
const path = require('path');

const SOURCE_DIR = './'; // JSON dosyaları doğrudan proje kök dizininde
const BACKUP_DIR = './backups'; // Yedeklerin saklanacağı ana klasör
const INTERVAL = 10 * 60 * 1000; // 10 dakika
const ONE_HOUR = 60 * 60 * 1000;
const ONE_DAY = 24 * ONE_HOUR;
const HALF_DAY = 12 * ONE_HOUR;

// Yedekleme fonksiyonu
function backupFiles(subDir) {
    const timestamp = Date.now();
    const backupPath = path.join(BACKUP_DIR, subDir, timestamp.toString());
    
    if (!fs.existsSync(backupPath)) {
        fs.mkdirSync(backupPath, { recursive: true });
    }

    fs.readdir(SOURCE_DIR, (err, files) => {
        if (err) {
            console.error('Kaynak klasörü okunamadı:', err);
            return;
        }

        files.forEach(file => {
            const srcFile = path.join(SOURCE_DIR, file);
            const destFile = path.join(backupPath, file);
            
            if (fs.statSync(srcFile).isDirectory()) return;
            
            if (file.endsWith('.json')) {
                fs.copyFileSync(srcFile, destFile);
            }
        });

        console.log(`${subDir} yedeği alındı: ${backupPath}`);
    });

    // Eski yedekleri temizle ve sadece en yeni olanı sakla
    cleanOldBackups(subDir);
}

// Eski yedekleri temizleme fonksiyonu (Sadece en güncel yedeği tutar)
function cleanOldBackups(subDir) {
    const backupPath = path.join(BACKUP_DIR, subDir);
    if (!fs.existsSync(backupPath)) return;
    
    fs.readdir(backupPath, (err, files) => {
        if (err) return console.error('Yedek klasörü okunamadı:', err);
        
        if (files.length > 1) {
            // Zaman damgalarına göre sırala ve en yeniyi sakla
            files.sort((a, b) => b - a);
            
            const newest = files[0];
            files.slice(1).forEach(file => {
                const filePath = path.join(backupPath, file);
                fs.rm(filePath, { recursive: true, force: true }, err => {
                    if (!err) console.log(`Eski yedek silindi: ${filePath}`);
                });
            });
        }
    });
}

// 10 dakikalık yedekleme (dokunulmayacak!)
setInterval(() => {
    backupFiles('10min');
    cleanOldBackups('10min', ONE_HOUR);
}, INTERVAL);

// Saatlik, 12 saatlik ve günlük yedekleme (sadece en güncel olanı saklayacak)
setInterval(() => backupFiles('1hour'), ONE_HOUR);
setInterval(() => backupFiles('12hours'), HALF_DAY);
setInterval(() => backupFiles('1day'), ONE_DAY);

console.log('Otomatik yedekleme başlatıldı...');
