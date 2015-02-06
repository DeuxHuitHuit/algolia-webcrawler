
// DNS cache implementation

var dns = require('dns'), cache = {};
dns._lookup = dns.lookup;
dns.lookup = function(domain, family, done) {
    if (!done) {
        done = family;
        family = null;
    }

    var key = domain+family;
    if (key in cache) {
        var ip = cache[key], 
            ipv = ip.indexOf('.') !== -1 ? 4 : 6;

        return process.nextTick(function() { 
            done(null, ip, ipv);
        });
    }

    dns._lookup(domain, family, function(err, ip, ipv) {
        if (err) return done(err);
        cache[key] = ip;
        done(null, ip, ipv);
    });
};