var tokens = require("./_token.js");
var fs = require("fs");
var Telegraf = require("telegraf");
var express = require("express");
var bodyParser = require("body-parser");
var path = require("path");
const { create } = require("domain");

var bot = new Telegraf(tokens.BOT_TOKEN);

//bot on join
// bot.on("new_chat_members", (ctx) => {
// 	ctx.reply(
// 		"Welcome to the Arcane Games chat! Type /help to see the commands.",
// 		{
// 			reply_markup: {
// 				keyboard: [[{ text: "help command" }]],

// 				resize_keyboard: true,
// 				one_time_keyboard: true,
// 			},
// 		}
// 	);
// });

bot.command(["help", "start"], (ctx) => {
	ctx.reply(
		"Welcome to the Arcane Games chat! Type /help to see the commands.",
		{
			reply_markup: {
				keyboard: [[{ text: "help command" }, { text: "create new product" }]],

				resize_keyboard: true,
			},
		}
	);
});

var is_uploading = false;
function createNewProduct(ctx) {
	ctx.reply("Please send the image of the product");
	is_uploading = true;
}
bot.on("photo", (ctx) => {
	if (is_uploading) {
		ctx.reply("Please send the name of the product");
		is_uploading = false;
	}
});
// bot on reply to bot message
bot.on("message", (ctx) => {
	if (is_uploading) {
		ctx.reply("Please send the image of the product");
	} else {
		if (ctx.message.text == "help command") {
			ctx.reply(help(ctx.message.from.id));
		} else if (ctx.message.text == "create new product") {
			createNewProduct(ctx);
		}
	}
});

bot.launch();
