// services/medicineModel.ts
import * as tf from '@tensorflow/tfjs';

export class MedicineClassifier {
  private model: tf.LayersModel | null = null;
  
  async loadModel() {
    this.model = await tf.loadLayersModel('path/to/your/model.json');
  }
  
  async classifyMedicine(imageTensor: tf.Tensor) {
    if (!this.model) await this.loadModel();
    const prediction = this.model.predict(imageTensor) as tf.Tensor;
    return prediction.dataSync();
  }
}