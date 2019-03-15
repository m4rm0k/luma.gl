import GL from '@luma.gl/constants';
import {Texture2D, TextureCube} from '../../webgl';
import {loadImage} from '../../core/load-file';

export default class GLTFEnvironment {
  constructor(gl, {brdfLutUrl, getTexUrl}) {
    this.gl = gl;
    this.brdfLutUrl = brdfLutUrl;
    this.getTexUrl = getTexUrl;
  }

  makeCube({id, getTextureForFace, parameters}) {
    return new TextureCube(this.gl, {
      id,
      mipmaps: false,
      parameters,
      pixels: {
        [GL.TEXTURE_CUBE_MAP_POSITIVE_X]: getTextureForFace('right'),
        [GL.TEXTURE_CUBE_MAP_NEGATIVE_X]: getTextureForFace('left'),

        [GL.TEXTURE_CUBE_MAP_POSITIVE_Y]: getTextureForFace('top'),
        [GL.TEXTURE_CUBE_MAP_NEGATIVE_Y]: getTextureForFace('bottom'),

        [GL.TEXTURE_CUBE_MAP_POSITIVE_Z]: getTextureForFace('front'),
        [GL.TEXTURE_CUBE_MAP_NEGATIVE_Z]: getTextureForFace('back')
      }
    });
  }

  getDiffuseEnvSampler() {
    if (!this._DiffuseEnvSampler) {
      this._DiffuseEnvSampler = this.makeCube({
        id: 'DiffuseEnvSampler',
        getTextureForFace: dir => loadImage(this.getTexUrl('diffuse', dir, 0)),
        parameters: {
          [GL.TEXTURE_WRAP_S]: GL.CLAMP_TO_EDGE,
          [GL.TEXTURE_WRAP_T]: GL.CLAMP_TO_EDGE,
          [GL.TEXTURE_MIN_FILTER]: GL.LINEAR,
          [GL.TEXTURE_MAG_FILTER]: GL.LINEAR
        }
      });
    }

    return this._DiffuseEnvSampler;
  }

  getSpecularEnvSampler() {
    if (!this._SpecularEnvSampler) {
      this._SpecularEnvSampler = this.makeCube({
        id: 'SpecularEnvSampler',
        getTextureForFace: dir => {
          const imageArray = [];
          for (let lod = 0; lod <= 9; lod++) {
            imageArray.push(loadImage(this.getTexUrl('specular', dir, lod)));
          }
          return imageArray;
        },
        parameters: {
          [GL.TEXTURE_WRAP_S]: GL.CLAMP_TO_EDGE,
          [GL.TEXTURE_WRAP_T]: GL.CLAMP_TO_EDGE,
          [GL.TEXTURE_MIN_FILTER]: GL.LINEAR_MIPMAP_LINEAR,
          [GL.TEXTURE_MAG_FILTER]: GL.LINEAR
        }
      });
    }

    return this._SpecularEnvSampler;
  }

  getBrdfTex() {
    if (!this._BrdfTex) {
      this._BrdfTex = new Texture2D(this.gl, {
        id: 'brdfLUT',
        parameters: {
          [GL.TEXTURE_WRAP_S]: GL.CLAMP_TO_EDGE,
          [GL.TEXTURE_WRAP_T]: GL.CLAMP_TO_EDGE,
          [GL.TEXTURE_MIN_FILTER]: GL.LINEAR,
          [GL.TEXTURE_MAG_FILTER]: GL.LINEAR
        },
        pixelStore: {
          [this.gl.UNPACK_FLIP_Y_WEBGL]: false
        },
        // Texture2D accepts a promise that returns an image as data (Async Textures)
        data: loadImage(this.brdfLutUrl)
      });
    }

    return this._BrdfTex;
  }
}
