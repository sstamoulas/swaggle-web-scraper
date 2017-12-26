var casper = require('casper').create({
    remoteScripts:  [
        'http://code.jquery.com/jquery-1.11.2.min.js'
    ]
});

var target = "https://www.grailed.com/feed/QsYjmINd3Q";

var scrolled = 0; // A variable to keep track of how much we have scrolled
var scrollDelta = null; // Keep track of how much our new scroll position differs from our last
var totalScrolls = 0;
var newScrolled = 0;
var result = [];

var getContent = function() {
    casper.wait(1000, function() { // Wait 1s and then (http://casperjs.readthedocs.org/en/latest/modules/casper.html#wait)
        console.log("The page just scrolled " + totalScrolls++ + " times");

        casper.scrollToBottom(); // scroll to the bottom (http://casperjs.readthedocs.org/en/latest/modules/casper.html#scrolltobottom)
        newScrolled = casper.evaluate(function() {
            return window.scrollY; // grab how far the window is scrolled (https://developer.mozilla.org/en-US/docs/Web/API/Window/scrollY)
        });
        scrollDelta = newScrolled - scrolled; // update scrollDelta
        scrolled = newScrolled; // and scrolled
        console.log("Now scrolled", scrolled);
    });
    casper.then(function() { // After we scroll to the bottom (http://casperjs.readthedocs.org/en/latest/modules/casper.html#then)
        if (scrollDelta != 0) { // Check whether scrollDelta is zero, which means that we haven't scrolled any further
            getContent(); // If scrollDelta _has_ changed, recursively call getContent
        } else {
            casper.then(function() { // Otherwise
                console.log("Return all the urls on the page");
                var urls = this.evaluate(function(){
                    var links = document.querySelectorAll(".row .feed-item a");
                    // iterate over links and collect stuff
                    return Array.prototype.map.call(links, function(link){
                        return {
                            href: link.href
                        };
                    });
                });

                console.log("Loop over each url and call its sub-page");
                casper.each(urls, function(self, url) {
                    self.thenOpen(url.href, function(response){
                        this.echo('Opening: ' + response.url);
                        this.waitUntilVisible('.show-listing', function(){
                            var item = casper.evaluate(function(url){
                                var brand = document.querySelector(".listing-details-wrapper .designer a");
                                var size = document.querySelector(".listing-details-wrapper .listing-size");
                                var price = document.querySelector(".listing-details-wrapper .listing-price .price");
                                var description = document.querySelector(".listing-details-wrapper #listing-description-text .listing-description");
                                var shipping = [].slice.call(document.querySelectorAll(".listing-shipping .shipping .item"));
                                var photos = [].slice.call(document.querySelectorAll(".listing-photos-wrapper #listing-photos .listing-show-images .carousel-and-thumbnails .thumbnails .thumbnail"));

                                return {
                                    url: url,
                                    brand: brand.text,
                                    size: size.innerText,
                                    price: price.innerText,
                                    description: description.innerText,
                                    shipping: JSON.stringify(Array.prototype.map.call(shipping,  function(x) {
                                        return x.querySelector(".location").innerText + ":" + x.querySelector(".amount").innerText; })),
                                    photos: JSON.stringify(Array.prototype.map.call(photos,  function(x) { 
                                        return x.querySelector("img").src; })),
                                };
                            }, response.url); //passes url to evaluate function

                            result.push(item);
                        });
                    });
                });
            });
            casper.then(function() {
                console.log("Saving...");
                var filename = "grailed.json";
                require('fs').write(filename, JSON.stringify(result, null, '  '), 'w'); // and save it to a file (https://docs.nodejitsu.com/articles/file-system/how-to-write-files-in-nodejs)
                console.log("…wrote HTML to", filename);
            });
        }
    });
};

casper.start(target, function() {
    console.log("Starting the application...");
    this.waitUntilVisible('.feed', function() {
        console.log("Loading " + target);
        getContent(this);
    });
});

casper.run();