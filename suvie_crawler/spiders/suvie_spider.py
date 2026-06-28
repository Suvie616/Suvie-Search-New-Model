import scrapy

class SuvieSpider(scrapy.Spider):
    name = 'suvie_spider'

    def __init__(self, start_url=None, max_pages=50, *args, **kwargs):
        super().__init__(*args, **kwargs)
        if not start_url:
            raise ValueError('start_url is required')
        self.start_urls = [start_url]
        self.allowed_domains = [scrapy.utils.url.parse_url(start_url).hostname]
        self.max_pages = int(max_pages)
        self.visited = set()

    def parse(self, response):
        if len(self.visited) >= self.max_pages:
            return
        self.visited.add(response.url)

        title = response.xpath('//title/text()').get() or response.url
        content = ' '.join(response.xpath('//body//text()').getall()).strip()
        yield {
            'url': response.url,
            'title': title.strip(),
            'content': content[:4000]
        }

        links = response.xpath('//a[@href]/@href').getall()
        for link in links:
            absolute = response.urljoin(link)
            if absolute in self.visited:
                continue
            if len(self.visited) >= self.max_pages:
                break
            yield scrapy.Request(absolute, callback=self.parse)
