import config from './config.json';
import mongoose from 'mongoose';
import Deps from './utils/deps';

import EventsService from './services/events.service';
import API from './api/server';
import GlobalBots from './global-bots';

Deps.build(API, EventsService, GlobalBots);

GlobalBots.init();

mongoose.connect(config.mongoURL, { 
    useUnifiedTopology: true, 
    useNewUrlParser: true, 
    useFindAndModify: false 
});