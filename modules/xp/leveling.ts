import { Message, GuildMember } from 'discord.js';
import { BotDocument } from '../../data/models/bot';
import Members from '../../data/members';
import Deps from '../../utils/deps';
import { MemberDocument } from '../../data/models/member';

export default class Leveling {
    constructor(private members = Deps.get<Members>(Members)) {}

    async validateXPMsg(msg: Message, savedGuild: BotDocument) {
        if (!msg?.member || !savedGuild || this.hasIgnoredXPRole(msg.member, savedGuild))
            throw new TypeError('Member cannot earn XP');

        const savedMember = await this.members.get(msg.member);

        this.handleCooldown(savedMember, savedGuild);

        const oldLevel = this.getLevel(savedMember.xp);
        savedMember.xp += savedGuild.leveling.xpPerMessage;
        const newLevel = this.getLevel(savedMember.xp);

        if (newLevel > oldLevel)
            this.handleLevelUp(msg, newLevel, savedGuild);

        savedMember.save();
    }
    handleCooldown(savedMember: MemberDocument, savedGuild: BotDocument) {
        const inCooldown = savedMember.recentMessages
            .filter(m => m.getMinutes() === new Date().getMinutes())
            .length > 3; // TODO: implement -> savedGuild.leveling.maxMessagesPerMinute;
        if (inCooldown)
            throw new TypeError('User is in cooldown');

        const lastMessage = savedMember.recentMessages[savedMember.recentMessages.length - 1];
        if (lastMessage && lastMessage.getMinutes() !== new Date().getMinutes())
            savedMember.recentMessages = [];
        
        savedMember.recentMessages.push(new Date());
    }

    private hasIgnoredXPRole(member: GuildMember, savedGuild: BotDocument) {
        for (const entry of member.roles.cache) { 
            const role = entry[1];
            if (savedGuild.leveling.ignoredRoles.some(id => id === role.id))
                return true;
        }
        return false;
    }

    private handleLevelUp(msg: Message, newLevel: number, savedGuild: BotDocument) {
        msg.channel.send(`Level Up! ⭐\n**New Level**: \`${newLevel}\``);

        const levelRole = this.getLevelRole(newLevel, savedGuild);
        if (levelRole)
            msg.member?.roles.add(levelRole);
    }
    private getLevelRole(level: number, savedGuild: BotDocument) {
        return savedGuild.leveling.levelRoles
            .find(r => r.level === level)?.role;
    }

    getLevel(xp: number) {
        const preciseLevel = (-75 + Math.sqrt(Math.pow(75, 2) - 300 * (-150 - xp))) / 150;            
        return Math.floor(preciseLevel);
    }
    static xpInfo(xp: number) {
        const preciseLevel = (-75 + Math.sqrt(Math.pow(75, 2) - 300 * (-150 - xp))) / 150;
        const level = Math.floor(preciseLevel);

        const xpForNextLevel = this.xpForNextLevel(level, xp);
        const nextLevelXP = xp + xpForNextLevel;        
         
        const levelCompletion = preciseLevel - level;

        return { level, xp, xpForNextLevel, levelCompletion, nextLevelXP };
    }
    private static xpForNextLevel(currentLevel: number, xp: number) {
        return ((75 * Math.pow(currentLevel + 1, 2)) + (75 * (currentLevel + 1)) - 150) - xp;
    }

    static getRank(member: MemberDocument, members: MemberDocument[]) {
        return members
            .sort((a, b) => b.xp - a.xp)
            .findIndex(m => m.id === member.id) + 1;
    }
}
