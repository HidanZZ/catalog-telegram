var tokens = require("./_token.js");
var Telegraf = require("telegraf");
const mongoose = require("mongoose");
const users = {};
var bot = new Telegraf(tokens.BOT_TOKEN);
const uri = tokens.MONGO_URI;
const Schema = mongoose.Schema;
console.log("Bot started");
const Product = new Schema({
	name: String,
	price: String,
	image: String,
	create_date: Date,
});
const Cart = new Schema({
	products: [
		{
			quantity: Number,
			product: { type: Schema.Types.ObjectId, ref: "Product" },
		},
	],
	user_id: String,
});
const ProductModel = mongoose.model("Product", Product);
const CartModel = mongoose.model("Cart", Cart);
let productsList = [];
mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });

function getAllProducts() {
	ProductModel.find({}, (err, products) => {
		if (err) {
			console.log(err);
		} else {
			productsList = products;
		}
	});
}
bot.command(["help", "start"], (ctx) => {
	console.log(tokens.ADMIN.split("$").includes(ctx.message.from.id.toString()));
	console.log(ctx.message.from.id);
	console.log(tokens.ADMIN.split("$"));
	ctx.reply(
		"Welcome to the bot`s start page. Please choose one of the following options",
		{
			reply_markup: {
				keyboard: [
					[
						{ text: "all products" },
						tokens.ADMIN.split("$").includes(ctx.message.from.id.toString())
							? { text: "create new product" }
							: "",
						{ text: "my cart" },
					],
				],

				resize_keyboard: true,
			},
		}
	);
});
function createUserIfNotExists(id) {
	if (!users[id]) {
		users[id] = {};
		users[id].is_create_new_product = false;
		users[id].product = {};
	}
}

function createNewProduct(ctx) {
	ctx.reply("Please send the photo of the product");
	createUserIfNotExists(ctx.message.from.id);
	users[ctx.message.from.id].is_create_new_product = true;
}

bot.on("photo", (ctx) => {
	if (userExist(ctx) && users[ctx.message.from.id].is_create_new_product) {
		if (!users[ctx.message.from.id].product.image) {
			users[ctx.message.from.id].product.image =
				ctx.message.photo[ctx.message.photo.length - 1].file_id;
		}
		if (!users[ctx.message.from.id].product.name) {
			ctx.reply("Please send the name of the product");
		} else if (!users[ctx.message.from.id].product.price) {
			ctx.reply("Please send the price of the product");
		}
	}
});
function removeNullProducts(cart) {
	if (!cart) return cart;
	return cart;
}
bot.hears("my cart", async (ctx) => {
	let cart = await CartModel.findOne({
		user_id: ctx.message.from.id,
	}).populate("products.product");
	console.log(cart);
	cart = removeNullProducts(cart);

	if (!cart || cart.products.length == 0) {
		ctx.reply("No products in cart");
		return;
	}
	const index = 0;
	ctx.replyWithPhoto(cart.products[index].product.image, {
		// caption: `*💲 Price :  ${cart.products[index].product.price}*\n*Quantity : ${cart.products[index].quantity}*`,
		parse_mode: "Markdown",
		reply_markup: {
			inline_keyboard: [
				[
					//price with emoji
					{
						text: `Price : ${cart.products[index].product.price}$`,
						callback_data: `no price`,
					},
				],
				[
					//quantity with emoji
					{
						text: `Quantity : ${cart.products[index].quantity}`,
						callback_data: `no quantity`,
					},
				],
				[
					{
						text: `1/${cart.products.length}`,
						callback_data: `no page`,
					},
				],
				[
					index - 1 < 0
						? {
								text: " ",
								callback_data: `no previous`,
						  }
						: {
								text: "⏮️",
								callback_data: `cmove ${index - 1}`,
						  },
					{
						text: "➖",
						callback_data: `cquantity ${index},-1`,
					},
					{
						text: "❌",
						callback_data: `cremove ${index}`,
					},
					{
						text: "➕",
						callback_data: `cquantity ${index},1`,
					},
					index + 1 >= cart.products.length
						? {
								text: " ",
								callback_data: `no next`,
						  }
						: {
								text: "⏭️",
								callback_data: `cmove ${index + 1}`,
						  },
				],
				[
					{
						text: "Checkout",
						callback_data: `checkout`,
					},
				],
			],
		},
	});
});
bot.hears("all products", async (ctx) => {
	productsList = await ProductModel.find({});
	if (productsList.length == 0) {
		ctx.reply("No products found");
		return;
	}
	console.log(productsList);
	ctx.replyWithPhoto(productsList[0].image, {
		parse_mode: "Markdown",
		id: 1,
		reply_markup: {
			inline_keyboard: [
				[
					{
						text: `Name : ${productsList[0].name}`,
						callback_data: `no price`,
					},
				],
				[
					{
						text: `Price : ${productsList[0].price}$`,
						callback_data: `no price`,
					},
				],
				[
					{
						text: " ",
						callback_data: `no previous`,
					},
					{
						text: "🛒",
						callback_data: `cart ${productsList[0]._id}`,
					},

					productsList.length == 1
						? {
								text: " ",
								callback_data: `no next`,
						  }
						: {
								text: "⏭️",
								callback_data: `next ${productsList[0]._id}`,
						  },
				],
				tokens.ADMIN.split("$").includes(ctx.message.from.username.toString())
					? [
							{
								text: "❌",
								callback_data: `pdelete ${productsList[0]._id}`,
							},
					  ]
					: [],
			],
		},
	});
});
// bot on reply to bot message
bot.on("message", (ctx) => {
	if (adminCommand(ctx)) {
		if (userExist(ctx) && users[ctx.message.from.id].is_create_new_product) {
			//check if product name is set else set it and ask for description

			//check if product description is set else set it and ask for price
			if (!users[ctx.message.from.id].product.image) {
				ctx.reply("Please send the image of the product");
			} else if (!users[ctx.message.from.id].product.name) {
				users[ctx.message.from.id].product.name = ctx.message.text;
				ctx.reply("Please send the price of the product");
			}
			//check if product price is set else set it and ask for image
			else if (!users[ctx.message.from.id].product.price) {
				users[ctx.message.from.id].product.price = ctx.message.text;
				users[ctx.message.from.id].is_create_new_product = false;
				const product = new ProductModel({
					name: users[ctx.message.from.id].product.name,
					price: users[ctx.message.from.id].product.price,
					image: users[ctx.message.from.id].product.image,
					create_date: new Date(),
				});
				product.save((err) => {
					if (err) {
						console.log(err);
					} else {
						ctx.reply("Product saved");
					}
				});
				users[ctx.message.from.id].product = {};
			}
			//check if product image is set else set it and ask for category
		} else {
			if (ctx.message.text == "create new product") {
				createNewProduct(ctx);
			}
		}
	}
});
function updateCartMessage(ctx, productWrapper, index, length) {
	ctx.editMessageMedia(
		{
			type: "photo",
			media: productWrapper.product.image,
			caption: `*💲 ${productWrapper.product.price} 💲*`,
			parse_mode: "Markdown",
		},
		{
			reply_markup: {
				inline_keyboard: [
					[
						//price with emoji
						{
							text: `Price : ${productWrapper.product.price}$`,
							callback_data: `no price`,
						},
					],
					[
						//quantity with emoji
						{
							text: `Quantity : ${productWrapper.quantity}`,
							callback_data: `no quantity`,
						},
					],
					[
						{
							text: `${index + 1}/${length}`,
							callback_data: `no page`,
						},
					],
					[
						index - 1 < 0
							? {
									text: " ",
									callback_data: `no previous`,
							  }
							: {
									text: "⏮️",
									callback_data: `cmove ${index - 1}`,
							  },
						{
							text: "➖",
							callback_data: `cquantity ${index},-1`,
						},
						{
							text: "❌",
							callback_data: `cremove ${index}`,
						},
						{
							text: "➕",
							callback_data: `cquantity ${index},1`,
						},
						index + 1 >= length
							? {
									text: " ",
									callback_data: `no next`,
							  }
							: {
									text: "⏭️",
									callback_data: `cmove ${index + 1}`,
							  },
					],
					[
						{
							text: "Checkout",
							callback_data: `checkout`,
						},
					],
				],
			},
		}
	);
}
bot.action("checkout", async (ctx) => {
	//send cart to CHECKOUT_USERS
	const users = tokens.CHECKOUT_USERS.split("$");
	const cart = await CartModel.findOne({
		user_id: ctx.from.id,
	}).populate("products.product");
	if (cart) {
		let message = `*Cart for ${ctx.from.first_name} ${ctx.from.last_name} :*`;
		let total = 0;
		cart.products.forEach((productWrapper) => {
			message += `\n*${productWrapper.product.name}* : ${
				productWrapper.quantity
			} x ${productWrapper.product.price} = ${
				productWrapper.quantity * productWrapper.product.price
			}`;
			total += productWrapper.quantity * productWrapper.product.price;
		});
		message += `\n*Total : ${total}*`;
		users.forEach((user) => {
			bot.telegram.sendMessage(user, message, {
				parse_mode: "Markdown",
			});
		});
		//delete cart
		cart.delete((err) => {
			if (err) {
				console.log(err);
			} else {
				ctx.reply("Order sent");
			}
		});
	}
});
bot.action(/^cremove/, async (ctx) => {
	const index = parseInt(ctx.match.input.split(" ")[1]);
	const cart = await CartModel.findOne({
		user_id: ctx.from.id,
	}).populate("products.product");
	if (cart) {
		if (index >= 0 && index < cart.products.length) {
			cart.products.splice(index, 1);
			cart.save((err) => {
				if (err) {
					console.log(err);
				} else {
					if (cart.products.length > 0) {
						updateCartMessage(ctx, cart.products[0], 0, cart.products.length);
					} else {
						ctx.editMessageMedia({
							type: "photo",
							media: "https://www.qrcardboard.com/images/cart.gif?v=01",
							caption: `*Your cart is empty*`,
							parse_mode: "Markdown",
						});
						ctx.editMessageCaption(`*Your cart is empty*`, {
							parse_mode: "Markdown",
						});
					}
				}
			});
		}
	}
});
bot.action(/^cmove/, async (ctx) => {
	const index = parseInt(ctx.match.input.split(" ")[1]);
	console.log("index", index);
	const cart = await CartModel.findOne({
		user_id: ctx.from.id,
	}).populate("products.product");
	if (cart) {
		if (index >= 0 && index < cart.products.length) {
			console.log(
				"last product",
				cart.products[index - 1],
				"index",
				index,
				"length",
				cart.products.length
			);
			console.log(
				"current product",
				cart.products[index],
				"index",
				index,
				"length",
				cart.products.length
			);
			updateCartMessage(ctx, cart.products[index], index, cart.products.length);
		}
	}
});
bot.action(/^cquantity/, async (ctx) => {
	console.log("cquantity");
	const productIndex = parseInt(ctx.match.input.split(" ")[1].split(",")[0]);
	const quantity = parseInt(ctx.match.input.split(" ")[1].split(",")[1]);
	const cart = await CartModel.findOne({
		user_id: ctx.from.id,
	}).populate("products.product");
	if (cart) {
		if (productIndex != -1) {
			if (cart.products[productIndex].quantity + quantity <= 0) {
				return;
			}

			cart.products[productIndex].quantity += quantity;

			cart.save((err) => {
				if (err) {
					console.log(err);
				} else {
					updateCartMessage(
						ctx,
						cart.products[productIndex],
						productIndex,
						cart.products.length
					);
					ctx.answerCbQuery("Product quantity updated");
				}
			});
		}
	}
});

bot.action(/^cart/, async (ctx) => {
	const productID = ctx.match.input.split(" ")[1];

	const product = await ProductModel.findById(productID).catch((err) =>
		console.log(err)
	);
	if (!product) {
		ctx.answerCbQuery("Product not found");
		return;
	}
	const cart = await CartModel.findOne({ user_id: ctx.from.id }).populate(
		"products.product"
	);
	if (cart) {
		//check if product already in cart
		const productIndex = cart.products.findIndex(
			(product) => product.product._id.toString() == productID
		);
		cart.products.forEach((product) => {
			console.log(product.product._id);
			console.log(new mongoose.Types.ObjectId(productID));
		});
		if (productIndex != -1) {
			cart.products[productIndex].quantity++;
		} else {
			cart.products.push({
				quantity: 1,
				product: productID,
			});
		}
		cart.save((err) => {
			if (err) {
				console.log(err);
			} else {
				ctx.answerCbQuery("Product added to cart");
			}
		});
	} else {
		const newCart = new CartModel({
			user_id: ctx.from.id,
			products: [
				{
					quantity: 1,
					product: product._id,
				},
			],
		});
		newCart.save((err) => {
			if (err) {
				console.log(err);
			} else {
				ctx.answerCbQuery("Product added to cart");
			}
		});
	}
});

// bot on callback query match starting with  "next"
bot.action(/^next/, async (ctx) => {
	const id = ctx.match.input.split(" ")[1];
	//get index of current product
	const index = productsList.findIndex((product) => product._id == id);
	//increment index
	const nextIndex = index + 1;
	ctx.editMessageMedia(
		{
			type: "photo",
			media: productsList[nextIndex].image,
			parse_mode: "Markdown",
		},
		{
			reply_markup: {
				inline_keyboard: [
					[
						{
							text: `Name : ${productsList[nextIndex].name}`,
							callback_data: `no price`,
						},
					],
					[
						{
							text: `Price : ${productsList[nextIndex].price}$`,
							callback_data: `no price`,
						},
					],
					[
						{
							text: "⏮️",
							callback_data: `previous ${productsList[nextIndex]._id}`,
						},
						{
							text: "🛒",
							callback_data: `cart ${productsList[nextIndex]._id}`,
						},
						//check if next product exist
						nextIndex + 1 < productsList.length
							? {
									text: "⏭️",
									callback_data: `next ${productsList[nextIndex]._id}`,
							  }
							: {
									text: " ",
									callback_data: `no next`,
							  },
					],
					tokens.ADMIN.split("$").includes(
						ctx.update.callback_query.from.id.toString()
					)
						? [
								{
									text: "❌",
									callback_data: `pdelete ${productsList[nextIndex]._id}`,
								},
						  ]
						: [],
				],
			},
		}
	);
});
bot.action(/^previous/, async (ctx) => {
	const id = ctx.match.input.split(" ")[1];
	//get index of current product
	const index = productsList.findIndex((product) => product._id == id);
	//increment index
	const previousIndex = index - 1;

	ctx.editMessageMedia(
		{
			type: "photo",
			media: productsList[previousIndex].image,
			parse_mode: "Markdown",
		},
		{
			reply_markup: {
				inline_keyboard: [
					[
						{
							text: `Name : ${productsList[previousIndex].name}`,
							callback_data: `no price`,
						},
					],
					[
						{
							text: `Price : ${productsList[previousIndex].price}$`,
							callback_data: `no  price`,
						},
					],
					[
						//check if next product exist
						previousIndex - 1 >= 0
							? {
									text: "⏮️",
									callback_data: `previous ${productsList[previousIndex]._id}`,
							  }
							: {
									text: " ",
									callback_data: `no previous`,
							  },
						{
							text: "🛒",
							callback_data: `cart ${productsList[previousIndex]._id}`,
						},
						{
							text: "⏭️",
							callback_data: `next ${productsList[previousIndex]._id}`,
						},
					],
					tokens.ADMIN.split("$").includes(
						ctx.update.callback_query.from.id.toString()
					)
						? [
								{
									text: "❌",
									callback_data: `pdelete ${productsList[previousIndex]._id}`,
								},
						  ]
						: [],
				],
			},
		}
	);
});
bot.action(/^pdelete/, async (ctx) => {
	const id = ctx.match.input.split(" ")[1];
	if (
		tokens.ADMIN.split("$").includes(
			ctx.update.callback_query.from.id.toString()
		)
	) {
		ProductModel.findByIdAndDelete(id, (err, product) => {
			ctx.reply("Product deleted");
		});
	}
});
function adminCommand(ctx) {
	if (tokens.ADMIN.split("$").includes(ctx.message.from.id.toString())) {
		return true;
	} else {
		ctx.reply("You are not admin");
		return false;
	}
}
function userExist(ctx) {
	if (users[ctx.message.from.id]) {
		return true;
	} else {
		return false;
	}
}
ProductModel.find({}, (err, products) => {
	productsList = products;
	bot.launch();
});
