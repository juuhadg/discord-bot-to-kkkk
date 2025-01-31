import { AudioPlayerStatus, createAudioPlayer, createAudioResource, joinVoiceChannel } from '@discordjs/voice';
import { Client, GatewayIntentBits } from 'discord.js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import puppeteer from 'puppeteer';
import puppeteerExtra from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import ytdl from 'youtube-dl-exec';
import { stealthBrowser } from './browser.js';
dotenv.config();
puppeteerExtra.use(StealthPlugin());

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildVoiceStates, 

    ],
});
client.login(process.env.DISCORD_TOKEN);


client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
})

let votes = {};
let castigosAtivos = [];
let votadores = {};
let lastCastigoTime = 0;
setInterval(() => {
    votadores = {};
    votes = {};
}, 10 * 60 * 1000); 

client.on('messageCreate', async (message) => {

    if (message.author.bot) return; 
    if (!message.content.startsWith('!')) return; 
    
    const args = message.content.slice(1).trim().split(/ +/);
    const command = args.shift().toLowerCase();
    
    if (command === 'castigo') {
        
        const member = message.mentions.members.first();
        if(!member) return message.reply('Por favor, mencione um membro para silenciar usando o @ dele.');
        if(!votadores[message.author.id]) votadores[message.author.id] = [];
        if (votadores[message.author.id].includes(member.id)) return;
        const voiceChannel = message.member.voice.channel;
        if (!voiceChannel) return message.reply('A pessoa precisa estar em um canal de voz para usar esse comando.');

        const memberCount = voiceChannel.members.size;

        if(castigosAtivos.includes(member.id)) return message.reply('O membro ja esta silenciado');

        if(Date.now() - lastCastigoTime < 300000) return message.reply('Apenas um castigo a cada 5 minutos.');

        if (!member) return message.reply('Por favor, mencione um membro para silenciar.');

        if (!member.voice.channel) return message.reply('O membro não está em um canal de voz.');

        if (member.voice.channel.id !== voiceChannel.id) return message.reply('O membro precisa estar no mesmo canal de voz que você.');

        if(!votes[member.id]) {
            votes[member.id] = 1;
        } else {
        votes[member.id] +=1;
        }


            votadores[message.author.id].push(member.id);
        
        

        message.reply(`Votos para castigar ${member.user.username}: ${votes[member.id]} / ${Math.ceil(memberCount / 2)} necessários`);

        if(votes[member.id] >= Math.ceil(memberCount / 2)) {
            try {
            lastCastigoTime = Date.now();
            castigosAtivos.push(member.id);
            member.voice.setMute(true, 'Silenciado temporariamente pelo bot');
            message.reply(`${member.user.username} tomou 1 minuto de castigo.`);
            
            
            setTimeout(async () => {
                votadores = {};
                try {
                    await member.voice.setMute(false, 'Silenciamento expirado');
                    message.channel.send(`${member.user.username} foi liberado do castigo.`);
                    votes[member.id] = 0;
                    castigosAtivos = castigosAtivos.filter(id => id !== member.id);
                } catch (error) {
                    console.error('Erro ao dessilenciar:', error);
                }
            }, 60000);
                
            } catch (error) {
                console.error(error);
                message.reply('Não foi possível silenciar o membro.');
            }
         }
            
    }
    else if(command === 'sorteartime'){
        const voiceChannel = message.member.voice.channel;
        if (!voiceChannel) return message.reply('A pessoa precisa estar em um canal de voz para usar esse comando.');
        let team1 = []
        let team2 = []
        voiceChannel.members.forEach(member => {
            let random = Math.floor(Math.random() * 2);
            if (random === 0) {
                team1.push(member);
            } else {
                team2.push(member);}
        })
 
        message.channel.send(`Equipe 1: ${team1.map(member => member.user.username).join(', ')}\nEquipe 2: ${team2.map(member => member.user.username).join(', ')}`);
    }
    else if (command === 'statstft') {

        try{
            const summonerName = args.join(' ');
            const name = summonerName.split('#')[0].trimEnd().trimStart();
            name.replace(' ', '%20');
            const tag = summonerName.split('#')[1];
            const url = `https://www.metatft.com/player/br/${name}-${tag}`;
            const browser = await puppeteer.launch({
                headless: true, 
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-accelerated-2d-canvas',
                    '--no-first-run',
                    '--no-zygote',
                    '--disable-gpu',
                ],
            });
            const page = await browser.newPage();
            await page.setViewport({
                width: 723, 
                height: 815, 
            });
            await page.goto(url);
            await page.waitForSelector('.PlayerProfileBanner');
            const element = await page.$('.PlayerProfileBanner'); 
            if (!element) {
                await browser.close();
                return message.reply('Não foi possível capturar a página!');
            }
            const screenshotPath = `./tft-screenshot-${name}.png`;
            await element.screenshot({ path: screenshotPath });

            await browser.close();

            
            await message.channel.send({
                files: [screenshotPath],
            });

            fs.unlinkSync(screenshotPath);
        }

        catch (error) {
            console.error(error);
            message.reply('Ocorreu um erro ao buscar as estatísticas.');
        }
        
    }
    else if (command === 'statsvalorant') {
        try{
            const summonerName = args.join(' ');
            const name = summonerName.split('#')[0].trimEnd().trimStart();
            name.replace(' ', '%20');
            const tag = summonerName.split('#')[1];
            const url = `https://tracker.gg/valorant/profile/riot/${name}%23${tag}/overview `;
            const browser = await puppeteerExtra.launch({
                  headless: true, 
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-accelerated-2d-canvas',
                    '--no-first-run',
                    '--no-zygote',
                    '--disable-gpu',
                ],
            });
            const page = await browser.newPage();
            await stealthBrowser(page);

            await page.goto(url);
            await page.waitForSelector('div[class*="segment-stats"]');
            const element1 = await page.$('div[class*="segment-stats"]'); 
            if (!element1) {
                await browser.close();
                return message.reply('Não foi possível capturar a página!');
            } 
            const screenshotPath1 = `./valorant-screenshot1-${name}.png`;

            await element1.screenshot({ path: screenshotPath1 });
            await page.waitForSelector('div[class*="top-agents"]');
            const element2 = await page.$('div[class*="top-agents"]'); 
            if (!element2) {
                await browser.close();
                return message.reply('Não foi possível capturar a página!');
            } 
            const screenshotPath2 = `./valorant-screenshot2-${name}.png`;
            await element2.screenshot({ path: screenshotPath2 });

            await browser.close();

            
            await message.channel.send({
                files: [screenshotPath1],
            });

            await message.channel.send({
                files: [screenshotPath2],
            });

            fs.unlinkSync(screenshotPath1);
            fs.unlinkSync(screenshotPath2);
        }

        catch (error) {
            console.error(error);
            message.reply('Ocorreu um erro ao buscar as estatísticas.');
        }
    }
    else if (command === 'tocar') {
        const link = args[0];
        const channel = message.member.voice.channel;
    
        if (!channel) {
            return message.reply('Você precisa estar em um canal de voz!');
        }
    
        const connection = joinVoiceChannel({
            channelId: channel.id,
            guildId: channel.guild.id,
            adapterCreator: channel.guild.voiceAdapterCreator,
        });

    
        const player = createAudioPlayer();
        connection.subscribe(player);
    
        try {
            let audioDir = "./audio.mp3"
            
            await downloadAndConvertToMP3(link, './');


            const resource = createAudioResource(fs.createReadStream(audioDir));
            player.play(resource);
            
            player.on(AudioPlayerStatus.Idle, () => {
                fs.unlinkSync('./audio.mp3')
                connection.destroy(); // Sai do canal após terminar o áudio
            });
    
            player.on('error', (error) => {
                fs.unlinkSync('./audio.mp3')
                console.error('Erro ao reproduzir o áudio:', error);
                connection.destroy();
            });
    
            message.reply(`Tocando: ${link}`);
        } catch (error) {
            fs.unlinkSync('./audio.mp3')
            console.error('Erro ao reproduzir o áudio:', error);
            connection.destroy();
            message.reply('Não foi possível reproduzir o áudio.');
        }
    }
    else if(command === 'parar') {
        const connection = getVoiceConnection(message.guild.id);
        if (connection) {
            connection.destroy();
            message.reply('Parando o áudio.');
        }
    }
    else {
        message.reply('Comando não reconhecido!');
    }
})



async function downloadAndConvertToMP3(url, outputDir) {
    try {
        // Definir o nome do arquivo de saída
        const fileName = path.join(outputDir, 'audio.mp3');

        // Baixar e converter o vídeo para MP3
        await ytdl(url, {
            format: 'bestaudio/best',
            postprocessorArgs: [
                {
                    key: 'FFmpegAudio',
                    format: 'mp3',
                    audioBitrate: 192,
                },
            ],
            output: fileName,
        });

        console.log(`Áudio convertido e salvo como MP3 em: ${fileName}`);
    } catch (error) {
        console.error('Erro ao baixar e converter o áudio:', error);
    }
}