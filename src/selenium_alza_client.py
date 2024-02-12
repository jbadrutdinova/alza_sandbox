import json
import time
import logging
from selenium import webdriver
from webdriver_manager.chrome import ChromeDriverManager
from selenium.webdriver.chrome.service import Service as ChromeService
from selenium.webdriver.common.by import By

class SeleniumAlzaClient:
    def __init__(self, config):
        self._driver = webdriver.Chrome(service=ChromeService(executable_path=ChromeDriverManager().install()))
        self._config = config
        self._logger = logging.getLogger('SeleniumAlzaClient')
    
    def __del__(self):
        self._driver.quit()

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self._driver.quit()

    def get_reviews_stats(self, product_ids):
        return self._get_reviews_stats(product_ids, use_generator=False)
    
    def get_reviews_stats_generator(self, product_ids):
        return self._get_reviews_stats(product_ids, use_generator=True)

    def _get_reviews_stats(self, product_ids, use_generator):
        ids_list = product_ids.copy()
        results = []

        for id in ids_list:
            try:
                url = f'https://webapi.alza.cz/api/catalog/commodities/{id}/reviewStats?country=CZ'
                self._driver.get(url)

                body_text = self._driver.find_element(By.XPATH, "/html/body").text
                review_stats = json.loads(body_text)
                review_stats['id'] = id
            except Exception as e:
                self._logger.warning(f'Failed to load data for id: {id}, with error: {e}')

                # Fake delay to retry in case we are throttled by alza
                if self._config['continue_on_error_delay'] is not None:
                    self._logger.info(f"Retrying to get data in {self._config['continue_on_error_delay']}ms")
                    time.sleep(self._config['continue_on_error_delay'])
                    ids_list.append(id)
                    continue
                else:
                    raise Exception(f'Failed to parse json for item id: {id}')

            try:
                out_stats = SeleniumAlzaClient.map_alza_review_stats_to_out_review_stats(review_stats)
                if use_generator:
                    yield out_stats
                else:
                    results.append(out_stats)
            except Exception as e:
                self._logger.warning(f'Failed to parse review stats for id {id}, with error: {e}')

            # Fake delay to slow down the data retrieval
            if self._config['delay'] is not None:
                time.sleep(self._config['delay'])
        
        return results
    
    def map_alza_review_stats_to_out_review_stats(stats):
        result = dict()
        result['id'] = stats['id']
        result['ratingAverage'] = stats['ratingAverage']
        result['ratingCount'] = stats['ratingCount']
        result['reviewCount'] = stats['reviewCount']
        result['minPurchaseCount'] = 0 if stats['purchaseCountFormatted'] is None else int(
            stats['purchaseCountFormatted']
                .replace('+', '')
                .replace(' ', '')
        )
        result['recommendationRate'] = stats['recommendationRate']
        result['complaintRate'] = 0 if stats['complaint']['rate'] is None else stats['complaint']['rate']
        result['ratings'] = [rating['count'] for rating in stats['ratings']]

        return result
