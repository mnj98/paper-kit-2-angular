import { Injectable } from '@angular/core';
import {HttpClient} from "@angular/common/http";
import {environment} from "../environments/environment";
import {Model} from "./components/components.component";

import {GeneratedImages, SavedImage} from "./components/basicelements/basicelements.component"
import {Observable} from "rxjs";

import {thumbnail, saved_image_data} from "./thumbnail";


const url:string = environment.backend_url//"http://ai-backgrounds.ddns.net"

enum RequestType{
    get,
    post
}

const thumbnail_image: string = thumbnail
const saved_image: string = saved_image_data

    const default_responses: Object = {"/generate-background": {
        prompt_text: 'prompt',
        images: [saved_image, saved_image, saved_image, saved_image],
        steps: -1,
        timeout: false
    },
    "/get-trained-models": {models: [{
        model_id: 'm1',
        name: 'm1',
        thumbnail: thumbnail_image,
        token: '<token>'
    },
        {
            model_id: 'm2',
            name: 'm2',
            thumbnail: thumbnail_image,
            token: '<token>'
        },
        {
            model_id: 'm3',
            name: 'm3',
            thumbnail: thumbnail_image,
            token: '<token>'
        },
        {
            model_id: 'm4',
            name: 'm4',
            thumbnail: thumbnail_image,
            token: '<token>'
        },]},
    "/get-generated-images": {output: [
            {
                image_id: '1',
                image: saved_image,
                prompt_text: 'prompt',
                rating: 0,
                steps: -1
            },
            {
                image_id: '2',
                image: saved_image,
                prompt_text: 'prompt',
                rating: 0,
                steps: -1
            },
            {
                image_id: '3',
                image: saved_image,
                prompt_text: 'prompt',
                rating: 0,
                steps: -1
            },
            {
                image_id: '4',
                image: saved_image,
                prompt_text: 'prompt',
                rating: 0,
                steps: -1
            },
        ]},
    "/save-images": null,
    "/delete-image": null
}

@Injectable({
  providedIn: 'root'
})
export class RequestSendService {

  constructor(private http: HttpClient) { }

    genImages(prompt_text: any, model_id: any, num_samples:any, steps:any){
      return this.debug_fallback<GeneratedImages>(RequestType.post, "/generate-background", {
          prompt_text: prompt_text, model_id: model_id, num_samples: num_samples, steps: steps
      })
      /*
      return this.http.post<GeneratedImages>(
          url+ "/generate-background", {
              prompt_text: prompt_text, model_id: model_id, num_samples: num_samples, steps: steps
          })*/
    }

    getTrainedModels(){
      console.log('get models')
      return this.debug_fallback<{models: [Model]}>(RequestType.get, "/get-trained-models", {})
      //return this.http.get<{models: [Model]}>(url + "/get-trained-models")
    }

    getGeneratedImages(model_id:any){
      return this.debug_fallback<{output: [SavedImage]}>(RequestType.post, "/get-generated-images", {model_id: model_id})
      //return this.http.post<{output: [SavedImage]}>(url + "/get-generated-images", {model_id: model_id})
    }

    saveImages(model_id:any, images:any, prompt_text: any){
      return this.debug_fallback<void>(RequestType.post, "/save-images", {model_id: model_id, images: images, prompt_text: prompt_text})
      //return this.http.post<void>(url+ "/save-images", {model_id: model_id, images: images, prompt_text: prompt_text})
    }

    deleteImage(model_id:any, image_id:any){
      return this.debug_fallback<void>(RequestType.post, "/delete-image",{model_id: model_id, image_id: image_id})
      //return this.http.post<void>(url + "/delete-image", {model_id: model_id, image_id: image_id})
    }

    debug_fallback<T>(fun: RequestType, path: string, body: Object){
      return new Observable<T>(observer => {
          if (fun == RequestType.get) {
            this.http.get<T>(url + path).subscribe({next: (value) => observer.next(value), error: () => {
                console.log("test")
                return observer.next(default_responses[path])
            }})
          }
          else if(fun == RequestType.post){
              this.http.post<T>(url + path, body).subscribe({next: (value) => observer.next(value), error: () => {
                      console.log("test")
                  observer.next(default_responses[path])}
              })
          }
      })

    }
}
