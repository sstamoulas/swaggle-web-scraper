//var express = require('express');
var fs = require('fs');
//var app     = express();
var cheerio = require('cheerio');
var phantom = require("phantom");
var Horseman = require("node-horseman");
var Promise = require("bluebird");
var _ph, _page, _outObj;
var results = [];
var promises = [];
var grandPromise;

var color,
    condition,
    description,
    id,
    price,
    productBrand,
    productCategory,
    productColor,
    productPhotos,
    productSize,
    retail,
    savings,
    shipping;

//old
//https://snobswap.com/shop/search?q=men#?p=0&pp=200&i=Items&categories=men&sold_flag=0:0&wholesale_flag=0:0

//new
//https://snobswap.com/shop/search?q=men#?p=0&pp=200&i=Items&wholesale_flag=0:0&sold_flag=0:0

console.log("Start the web scrape!")

phantom.create().then(ph => {
    _ph = ph;
    return _ph.createPage();
}).then(page => {
	var requestUrl = 'https://snobswap.com/shop/search?q=men#?p=0&pp=200&i=Items&wholesale_flag=0:0&sold_flag=0:0';
    _page = page;
	console.log("Open up request to", requestUrl);
    return _page.open(requestUrl);
}).then(status => {
    console.log("Status: ", status);
    return _page.property('content')
}).then(content => {
	console.log("Loading content for parsing...");
    var $ = cheerio.load(content);

    $('.ng-scope .item').each(function(){

        productPhotos = $(this).find('.image a img').attr('src');
        productBrand = $(this).find('.brand').text();
        productCategory = $(this).find('.cat a').attr('title');
        description = $(this).find('.cat a').text();
        price = $(this).find('.meta .price').text();
        retail = $(this).find('.meta div .retail span').text();
        savings = $(this).find('.meta .savings').text();
        productSize = $(this).find('.meta div .size').text();

        var link = $(this).find('.cat a').attr('href');

        var rex = /\[.*\]/g;

        productCategory = rex.exec(productCategory)[0];

        if(productCategory.indexOf('\"men\"') > -1) {

            results.push(
                {
                    productPhotos: productPhotos,
                    productBrand: productBrand,
                    productCategory: productCategory,
                    description: description,
                    price: price,
                    retail: retail,
                    savings: savings,
                    productSize: productSize,
                    link: link,
                    color: "",
                    condition: ""
                }
            )
        }

    });

    return results;
}).then(function(){
	var maxCount = 5;
	var index = 0;
	console.log("Begin extracting additional details for " + results.length + " item(s).")
	grandPromise = new Promise(function(resolve, reject) { resolve(true) });

    results.forEach(function(item){
		var delayedPromise = function() {
			var delayInMS = 0; // delay in milliseconds
			return Promise.delay(delayInMS).then(function() {
				var requestIndex = results.indexOf(item) + 1;

				console.log(requestIndex + "/" + results.length + " item request URL", item.link, "Timestamp", new Date(), "Extra delay (ms)", delayInMS);
				return extractDetailsFromItemPage(item);
			});
		}
		grandPromise = grandPromise.then(delayedPromise);
    });
}).then(function(){
    _page.close();

	grandPromise.then(function(){
		var fileName = 'snobswap.json';
		console.log("All requests complete. Writing out data to file...", fileName);

        fs.writeFile(fileName, JSON.stringify(results, null, 4), function(err){
            console.log('File successfully written! - Check your project directory for the file', fileName);
			_ph.exit();
        })
    });
});

function extractDetailsFromItemPage(item){
    var horseman = new Horseman();

    return new Promise(function(resolve, reject) {
        return horseman
           // Open the page
           .open(item.link)
           .waitForSelector('body')
           .html('.sizing')
           .then(function(content){
                item.color = content.substring(getPosition(content, 'Color: ', 1) + 'Color: '.length, getPosition(content, '<br>', 2));
                item.condition = content.substring(getPosition(content, 'Condition: ', 1) + 'Condition: '.length, getPosition(content, ' <span class="', 2));
                resolve(item);
           })
           .catch(function(e) {
			   console.log("Got an error in horseman", e);
			   reject(e);
		   })
           .close();
    });
}

/*
Promise.all(result)
.then(function(json){
    var horseman = new Horseman();

    horseman
       // Open the page
       .open(json.link)
       .waitForSelector('body')
       .html('.sizing')
       .then(function(content){
            json.color = content.substring(getPosition(content, 'Color: ', 1) + 'Color: '.length, getPosition(content, '<br>', 2));
            json.condition = content.substring(getPosition(content, 'Condition: ', 1) + 'Condition: '.length, getPosition(content, ' <span class="', 2));
            console.log("Color = " + color + " Condition = " + condition);
            return content;
       })
       .catch(function(error){console.log(error)})
       .close();
}).then(function(){

    fs.writeFile('snobswap.json', JSON.stringify(result, null, 4), function(err){

        console.log('File successfully written! - Check your project directory for the snobswap.json file');

    })
});
*/


function getPosition(string, subString, index) {
   return string.split(subString, index).join(subString).length;
}

function clickItems() {
    var $items = $('.ng-scope .item');

    $items.each(function(index, $item) {

        fs.writeFile('url.json', JSON.stringify(resultLinks, null, 4), function(err){

            console.log('File successfully written! - Check your project directory for the url.json file');

        })
    });
}

/*var page = require('webpage').create();
page.settings.resourceTimeout = 5000;

page.open('https://www.grailed.com/feed/QsYjmINd3Q?cursor=ApwFZmlsdGVycz0oc3RyYXRhJTNBJ2Jhc2ljJyklMjBBTkQlMjAoY2F0ZWdvcnlfcGF0aCUzQSdvdXRlcndlYXIubGVhdGhlcl9qYWNrZXRzJyUyME9SJTIwY2F0ZWdvcnlfcGF0aCUzQSdvdXRlcndlYXIuY2xvYWtzX2NhcGVzJyUyME9SJTIwY2F0ZWdvcnlfcGF0aCUzQSdvdXRlcndlYXIucGFya2FzJyUyME9SJTIwY2F0ZWdvcnlfcGF0aCUzQSdvdXRlcndlYXIuYm9tYmVycyclMjBPUiUyMGNhdGVnb3J5X3BhdGglM0Enb3V0ZXJ3ZWFyLnZlc3RzJyUyME9SJTIwY2F0ZWdvcnlfcGF0aCUzQSdvdXRlcndlYXIucmFpbmNvYXRzJyUyME9SJTIwY2F0ZWdvcnlfcGF0aCUzQSdvdXRlcndlYXIuaGVhdnlfY29hdHMnJTIwT1IlMjBjYXRlZ29yeV9wYXRoJTNBJ291dGVyd2Vhci5saWdodF9qYWNrZXRzJyUyME9SJTIwY2F0ZWdvcnlfcGF0aCUzQSdvdXRlcndlYXIuZGVuaW1famFja2V0cycpJTIwQU5EJTIwKG1hcmtldHBsYWNlJTNBZ3JhaWxlZCkmaGl0c1BlclBhZ2U9NDAmZmFjZXRzPSU1QiUyMnN0cmF0YSUyMiUyQyUyMnNpemUlMjIlMkMlMjJjYXRlZ29yeSUyMiUyQyUyMmNhdGVnb3J5X3NpemUlMjIlMkMlMjJjYXRlZ29yeV9wYXRoJTIyJTJDJTIyY2F0ZWdvcnlfcGF0aF9zaXplJTIyJTJDJTIyY2F0ZWdvcnlfcGF0aF9yb290X3NpemUlMjIlMkMlMjJwcmljZV9pJTIyJTJDJTIyZGVzaWduZXJzLmlkJTIyJTJDJTIybG9jYXRpb24lMjIlMkMlMjJtYXJrZXRwbGFjZSUyMiU1RCZwYWdlPTI1JnF1ZXJ5PWIBBzM0NjMyMDE%3D', function (s) {
    console.log(s);
    phantom.exit();
});

var content = page.property('content')
var $ = cheerio.load(content);

    var productCategory,
        productBrand,
        productSize,
        productColor,
        productPhotos,
        description,
        condition,
        price,
        retails,
        savings,
        shipping;

    var json = {
        productCategory : "",
        productBrand : "",
        productSize : "",
        productColor : "",
        productPhotos : "",
        description : "",
        condition : "",
        price : 0.00,
        retail : 0.00,
        savings : "",
        shipping : ""
    };

    var result = [];

    $('.feed .row .feed-item a').each(function(){


        productPhotos = $(this).find('.listing-cover-photo img').attr('src');
        productBrand = $(this).find('.listing-metadata .listing-designer-and-size .listing-designer').text();
        price = $(this).find('.listing-price-and-heart .listing-price .original-price').text();
        productSize = $(this).find('.listing-size').text();

        result.push(
            {
                productPhotos: productPhotos,
                productBrand: productBrand,
                price: price,
                productSize: productSize
            }
        )

    })

    fs.writeFile('output1.json', JSON.stringify(result, null, 4), function(err){

        console.log('File successfully appended! - Check your project directory for the output.json file');

    })

page.close();
webpage.exit();
*/

/*phantom.create().then(ph => {
    _ph = ph;
    return _ph.createPage();
}).then(page => {
    _page = page;
    return _page.open('https://www.grailed.com/feed/QsYjmINd3Q?cursor=ApwFZmlsdGVycz0oc3RyYXRhJTNBJ2Jhc2ljJyklMjBBTkQlMjAoY2F0ZWdvcnlfcGF0aCUzQSdvdXRlcndlYXIubGVhdGhlcl9qYWNrZXRzJyUyME9SJTIwY2F0ZWdvcnlfcGF0aCUzQSdvdXRlcndlYXIuY2xvYWtzX2NhcGVzJyUyME9SJTIwY2F0ZWdvcnlfcGF0aCUzQSdvdXRlcndlYXIucGFya2FzJyUyME9SJTIwY2F0ZWdvcnlfcGF0aCUzQSdvdXRlcndlYXIuYm9tYmVycyclMjBPUiUyMGNhdGVnb3J5X3BhdGglM0Enb3V0ZXJ3ZWFyLnZlc3RzJyUyME9SJTIwY2F0ZWdvcnlfcGF0aCUzQSdvdXRlcndlYXIucmFpbmNvYXRzJyUyME9SJTIwY2F0ZWdvcnlfcGF0aCUzQSdvdXRlcndlYXIuaGVhdnlfY29hdHMnJTIwT1IlMjBjYXRlZ29yeV9wYXRoJTNBJ291dGVyd2Vhci5saWdodF9qYWNrZXRzJyUyME9SJTIwY2F0ZWdvcnlfcGF0aCUzQSdvdXRlcndlYXIuZGVuaW1famFja2V0cycpJTIwQU5EJTIwKG1hcmtldHBsYWNlJTNBZ3JhaWxlZCkmaGl0c1BlclBhZ2U9NDAmZmFjZXRzPSU1QiUyMnN0cmF0YSUyMiUyQyUyMnNpemUlMjIlMkMlMjJjYXRlZ29yeSUyMiUyQyUyMmNhdGVnb3J5X3NpemUlMjIlMkMlMjJjYXRlZ29yeV9wYXRoJTIyJTJDJTIyY2F0ZWdvcnlfcGF0aF9zaXplJTIyJTJDJTIyY2F0ZWdvcnlfcGF0aF9yb290X3NpemUlMjIlMkMlMjJwcmljZV9pJTIyJTJDJTIyZGVzaWduZXJzLmlkJTIyJTJDJTIybG9jYXRpb24lMjIlMkMlMjJtYXJrZXRwbGFjZSUyMiU1RCZwYWdlPTI1JnF1ZXJ5PWIBBzM0NjMyMDE%3D');
}).then(status => {
    console.log(status);
    return _page.property('content')
}).then(content => {
    var $ = cheerio.load(content);

    var productCategory,
        productBrand,
        productSize,
        productColor,
        productPhotos,
        description,
        condition,
        price,
        retails,
        savings,
        shipping;

    var json = {
        productCategory : "",
        productBrand : "",
        productSize : "",
        productColor : "",
        productPhotos : "",
        description : "",
        condition : "",
        price : 0.00,
        retail : 0.00,
        savings : "",
        shipping : ""
    };

    var result = [];

    $('.feed .row .feed-item a').each(function(){


        productPhotos = $(this).find('.listing-cover-photo img').attr('src');
        productBrand = $(this).find('.listing-metadata .listing-designer-and-size .listing-designer').text();
        price = $(this).find('.listing-price-and-heart .listing-price .original-price').text();
        productSize = $(this).find('.listing-size').text();

        result.push(
            {
                productPhotos: productPhotos,
                productBrand: productBrand,
                price: price,
                productSize: productSize
            }
        )

    })

    fs.writeFile('grailed.json', JSON.stringify(result, null, 4), function(err){

        console.log('File successfully appended! - Check your project directory for the output.json file');

    })
    _page.close();
    _ph.exit();
});
*/

/*
phantom.create().then(ph => {
    _ph = ph;
    return _ph.createPage();
}).then(page => {
    _page = page;
    return _page.open('https://www.therealreal.com/designers/brunello-cucinelli/men');
}).then(status => {
    console.log(status);
    return _page.property('content')
}).then(content => {
    //console.log(content);
    var $ = cheerio.load(content);

    var productCategory,
        productBrand,
        productSize,
        productColor,
        productPhotos,
        description,
        condition,
        price,
        retails,
        savings,
        shipping;

    var json = {
        productCategory : "",
        productBrand : "",
        productSize : "",
        productColor : "",
        productPhotos : "",
        description : "",
        condition : "",
        price : 0.00,
        retail : 0.00,
        savings : "",
        shipping : ""
    };

    var result = [];

    $('.ng-scope .item').each(function(){

        productPhotos = $(this).find('.image a img').attr('src');
        productBrand = $(this).find('.brand').text();
        productCategory = $(this).find('.cat a').attr('title');
        description = $(this).find('.cat a').text();
        price = $(this).find('.meta .price').text();
        retail = $(this).find('.meta div .retail span').text();
        savings = $(this).find('.meta .savings').text();
        productSize = $(this).find('.meta div .size').text();

        var rex = /\[.*\]/g;

        productCategory = rex.exec(productCategory)[0];

        result.push(
            {
                productPhotos: productPhotos,
                productBrand: productBrand,
                productCategory: productCategory,
                description: description,
                price: price,
                retail: retail,
                savings: savings,
                productSize: productSize
            }
        )

    })
    //console.log(productPhotos);

    fs.writeFile('output.json', JSON.stringify(result, null, 4), function(err){

        console.log('File successfully written! - Check your project directory for the output.json file');

    })
    _page.close();
    _ph.exit();
});
*/
/*
app.listen('8081')

console.log('Magic happens on port 8081');

exports = module.exports = app;*/
