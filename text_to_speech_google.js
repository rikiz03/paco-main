const gtts = require('gtts');
const pygame = require('pygame');
const { Readable } = require('stream');

const language = 'en';
const tld = 'ca';

function synthesize(text) {
    const myobj = new gtts(text, language, tld);
    const mp3_fp = new Readable();
    myobj.writeToStream(mp3_fp);
    const sound = mp3_fp;
    sound.seek(0);
    pygame.mixer.music.load(sound, 'mp3');
    return pygame.mixer.music.play();
}

