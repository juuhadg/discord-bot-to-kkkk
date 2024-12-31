import dotenv from 'dotenv';
dotenv.config();
import { Client, GatewayIntentBits } from 'discord.js';

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildVoiceStates, 
    ],
});
console.log(process.env.DISCORD_TOKEN);
client.login(process.env.DISCORD_TOKEN);

client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
})

let votes = {};
let castigosAtivos = [];
let votadores = {};
let lastCastigoTime = 0;

client.on('messageCreate', (message) => {

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
                try {
                    await member.voice.setMute(false, 'Silenciamento expirado');
                    message.channel.send(`${member.user.username} foi liberado do castigo.`);
                    votes[member.id] = 0;
                    castigosAtivos = castigosAtivos.filter(id => id !== member.id);
                    votadores[message.author.id] = votadores[message.author.id].filter(id => id !== member.id);
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
    else {
        message.reply('Comando não reconhecido!');
    }
})
