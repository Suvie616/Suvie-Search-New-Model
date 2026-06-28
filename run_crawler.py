from scrapy.crawler import CrawlerProcess
from scrapy.utils.project import get_project_settings
from scrapy.utils.url import urlparse
import sys

if len(sys.argv) < 2:
    print('Usage: python run_crawler.py <start-url> [max-pages]')
    sys.exit(1)

start_url = sys.argv[1]
max_pages = sys.argv[2] if len(sys.argv) > 2 else 50

settings = get_project_settings()
settings.set('FEEDS', {
    'crawl_output.json': {
        'format': 'json',
        'encoding': 'utf8',
        'overwrite': True,
    }
})
process = CrawlerProcess(settings)
process.crawl('suvie_spider', start_url=start_url, max_pages=max_pages)
process.start()
